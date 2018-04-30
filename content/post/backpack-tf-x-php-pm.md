---
title: "backpack.tf x PHP-PM"
date: 2018-03-14T12:25:49Z
tags: ["programming"]
draft: true
---

I've known about PHP-PM for a couple years now. From the get-go, the project showed promise, but I was uncertain if it was going to be stable enough to run arbitrary web applications previously running in PHP-FPM land.

PHP-PM is based on ReactPHP, a project that adds event-driven programming to the language. To novice PHP developers, the concept of an event loop seems almost alien: as far as most PHP applications go, each request starts with a clean slate. For every request, classes need to be loaded into memory, routing needs to be determined, database handles need to be instantiated, and so on. When using heavy frameworks, there is a great deal of cost involved with receiving a request and actually handling it. The debt is unnecessary CPU usage, and increased response time.

Until now, PHP has never really acted as a server in its own right. PHP-FPM merely delegates requests to a number of idle PHP instances, and as soon as a response is dispatched the process starts from scratch again. With ReactPHP, and by extension PHP-PM, PHP is now equipped with the means to overcome even the flexibility of a MEAN stack.

![bp-db](/img/blog/ppm-bp-db.png)

Database load has nearly halved, thanks to the use of more efficient caching strategies. Inventory load times have been cut down exponentially.

![workers](/img/blog/ppm-workers.png)

PHP is at the point where it is mature enough to act as a server in its own right.

So, this is how we got backpack.tf, a formerly naive and simple PHP application, running under PHP-PM. I'm going to try and write this in a way that reinforces some important concepts about the architecture PHP has formerly lacked.

## Setting up PHP-PM for development

Similar to the built-in PHP server, PHP-PM can run standalone and serve static files.

In debug mode, it will detect changes to PHP files that have been loaded in memory and reload itself. Unfortunately, this behaviour isn't perfect: we're using Twig, whose file loader will keep templates in memory even if all caching options are disabled.    

So you can check for persistence bugs (or optimisations) later, set the number of workers to 1.

## $_GET good

The PHP Standards Requirements working group has accomplished quite a lot in standardising how different PHP libraries and frameworks cooperate. [PSR-7](https://www.php-fig.org/psr/psr-7/) is one of my favorite specifications, and a lot of good libraries have adopted it. Another important PSR specification is the PSR-15 middleware stack, which will be covered later.

The request and response interfaces supplied by PSR-7 provide abstractions around HTTP messages. Objects that correctly implement these interfaces are immutable, so modifications to the response objects are chained as it traverses through the middleware stack. The benefit of immutable objects is very fine control for middleware: should it be necessary, a layer of middleware can disregard changes to a response somewhere else in the chain entirely, and continue using a previous response object with the guarantee that it has not been changed, eliminating possible bugs.

Depending on your implementation -- for example, backpack.tf uses the [Slim framework](https://slimframework.com) for routing and middleware -- you may have access to various helper methods that do not necessarily conform to the standard. Chances are your application supports PSR-7 and middleware if your controllers resemble something like this:

```php
class Controller {
    public function redirect(Request $request, Response $response): Response {
        if ($request->getParam('here') {
            return $response->withRedirect('/');
        } else {
            return $response->withRedirect('https://www.google.com');
        }
    }
}
```

If this kind of thing looks familiar, you're probably already halfway towards running your software on top of PHP-PM.

Many will know of PHP's several superglobals: `$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE`, `$_SESSION`, `$_FILES` and `$_SERVER`. These are the first things that should be removed from any modern PHP application that uses the PSR-7 request/response lifecycle -- superglobals that contain information per request are incompatible with the concept of scopes. As PHP-PM is keeping workers alive to handle potentially infinite requests in their lifetime, we must not have information about one request leaking into the next.

While it is possible for the request/response lifecycle to repopulate superglobals such as `$_SERVER` (in fact, [PHP-PM is doing this](https://github.com/php-pm/php-pm/blob/1ae68b2db22b5f2acfd0e2b30fa54bdfb5c9a216/src/ProcessSlave.php#L425)), I wouldn't recommend continuing to use them, as availability of these superglobals won't be consistent among applications built on PHP-PM, and global request parameters simply just don't belong in this environment. PSR-7 request objects encapsulate all the data you need, including the request body, any uploaded files, headers, and so on.

As long as your web application does support a PSR-7 interface, updating your web application for PHP-PM will require you to do the following:

* Replace usage of `$_GET`, `$_POST` and `$_REQUEST` with the PSR-7 `getParam()` or `getParams()` methods.
* For request bodies of more advanced APIs, awkward `php://input` stream reads can be replaced with `getBody()`. PSR-7 implementations also provide a `getParsedBody()`, which will attempt to deserialize the request body based on the Content-Type header.
* Replace `$_COOKIE` with `getCookieParams()`, and `setcookie()` with the response object's `withCookieParams()`.
* Replace `$_SERVER` with `getServerParam()` or `getServerParams()`. The fields will still be equivalent.
* Replace `$_FILES` with `getUploadedFiles()`.

After doing all of this, hopefully you will begin to see the advantages of refactored PSR-7 code. Be sure to check the documentation of the PSR-7 implementation you are using, as they may provide additional, non-standard methods to help you read requests and build responses.

Make sure your sessions are properly encapsulated -- you absolutely do not want to have a leaky session manager! Ideally, your sessions should begin with `session_start()` and end in `session_write_close()`. For safety, be sure to invalidate `session_id()` and unset `$_SESSION` post-request. Check your sessions are correctly scoped by visiting the site through several different browsers.

## Bootstrapping your application

PHP-PM functions by leveraging [PSR-15](https://www.php-fig.org/psr/psr-15/) server request handling to delegate requests to your application. The PHP-PM worker will be the first port-of-call in your middleware stack, deferring a request to your application which will be routed accordingly. This requires the use of a bridge that will convert a ReactPHP request to one that will be compatible with your application (as your controllers may be using a concrete request implementation). 

We're not using one of the supported frameworks, but we can write our own bootstrapper. As long as your application is sensible, the bootstrap will be quite thin and simple. Aside from request transforming, you may want to put here any post-request resets specific to your application.

## Taking advantage (and care) of persistence

PHP-PM is a huge leap from standard CGI PHP, and with it comes the ability to leverage PHP memory between requests. This could speed your application up a lot if you are constantly loading data you know is going to remain the same, but depending on how complex your application is, this behaviour could have consequences.

You should be checking what static variables are being set throughout your application code during runtime. Static values are going to persist between requests if left unchecked, so any values kept in memory should be scrutinised. If you do keep an intermediary cache for data that might get stale after each request, be sure to flush this data after each request is performed. You could also run `get_defined_vars()` before a request to see if there's any leftover variables that shouldn't be there.

It is very important you internalise that you are no longer writing scripts that starts fresh on each request. Once you do, you can: 

* Fine-tune what data is kept between requests, and use PHP memory as a primary cache layer.
* Keep database handles open, eliminating the overhead of opening and closing connections per request. 

### Better than Redis: in-memory cache

If you're using a composite caching library that interfaces with Redis or another cache provider, you should take advantage of PHP's own memory.

backpack.tf's cache implementation for the item schema and item prices  

## In Production

First things first, you will definitely want to put PHP-PM behind nginx just as you would with PHP-FPM. This is to defer static file handling to nginx, so only actual page requests are sent upstream.

The official documentation recommends you to set the number of workers to CPU count plus one -- your mileage may vary. We're often loading in rather large pages and API calls and there's not much we can do about it, so you may need to increase this value a bit more, lest we leave our site at the behest of a dozen people trying to load an inventory.  

## drafts

For PHP-PM to be implemented properly, one should have a solid understanding of how HTTP requests work. 

PHP-PM is still a bit buggy. I'm using [my own fork](https://github.com/fiskie/php-pm), as there were some issues running it with a high number of workers.