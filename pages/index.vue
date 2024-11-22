<template>
  <div class="container">
    <Header />
    <PageSection class="games">
      <template #title>
        Games
      </template>
      <div class="projects-list">
        <Project v-for="game in games" v-bind="game" />
      </div>
    </PageSection>
    <PageSection class="projects">
      <template #title>
        Projects
      </template>
      <div class="projects-list">
        <Project v-for="project in projects" v-bind="project" />
      </div>
    </PageSection>
    <PageSection class="merchandise">
      <template #title>
        Art & Design
      </template>
      <p class="text">
        I do artwork! You'll find some of my works through vendors I have collaborated with. Buying my merch will help me out!!
      </p>
      <p class="text">
        (these vendors work with multiple artists and I am only a small part; you'll have to find my stuff...)
      </p>
      <div class="contact-links">
        <a class="contact" v-for="contact in merchCollabs" :href="contact.url" target="_blank">
          <div class="contact__name">
            {{ contact.name }}
          </div>
          <div class="contact__username">
            {{ contact.username }}
          </div>
        </a>
      </div>
    </PageSection>
    <PageSection class="who">
      <template #title>
        Who?
      </template>
      <div class="text">
        <p>
          I'm fisk🇬🇧! I have written software, mostly for the web, for over a decade.
        </p>
        <ul>
          <li>
            I try to release one game every year. Technologies vary. I want to slowly work on bigger things.
          </li>
          <li>
            I travel quite a bit. 30 🇺🇸 states and counting. Invite me to your house
          </li>
          <li>
            The Yogscast <a href="https://www.youtube.com/watch?v=4qRQj7tsICM" target="_blank">played a TTT map</a> I made when I was 18 or so
          </li>
        </ul>
      </div>
    </PageSection>
    <PageSection class="contact-me">
      <template #title>
        Reach me
      </template>
      <p class="text">
        Personal and business only, please! (or if you want to buy me a Ko-fi...!)
      </p>
      <div class="contact-links">
        <a class="contact" v-for="contact in contacts" :href="contact.url" target="_blank">
          <div class="contact__name">
            {{ contact.name }}
          </div>
          <div class="contact__username">
            {{ contact.username }}
          </div>
        </a>
      </div>
    </PageSection>
  </div>
</template>
<script setup lang="ts">
import Project, {type ProjectProps} from "~/components/Project.vue";

const games: ProjectProps[] = [
  {
    title: "Idler!",
    description: "A sequel to <em>Idler</em>, an idle game I originally wrote in 2012. Under active development as I come up with new ideas.",
    tags: ["Vue", "TypeScript"],
    color: "#7cff00",
    icon: "./icons/idler.png",
    subtitle: "Hat-based waiting simulator",
    year: "2023",
    url: "https://idler.backpack.tf"
  },
  {
    title: "Phasm8",
    description: "A Pico-8 demake of Phasmophobia in 32KB.",
    tags: ["Pico-8"],
    color: "#ff6d00",
    icon: "./icons/phasm8.png",
    subtitle: "Phasmophobia in 32kb",
    year: "2022",
    url: "https://kemohaus.itch.io/phasm8"
  },
  {
    title: "Kemobomb Remix",
    description: "A cute Pico-8 Puyo-like! Including endless and 2-player modes, and a unique soundtrack.",
    tags: ["Pico-8"],
    color: "#ff0101",
    icon: "./icons/kemobomb-remix.png",
    subtitle: "A cute Pico-8 Puyo-like",
    year: "2021",
    url: "https://kemohaus.itch.io/kemobomb-remix"
  },
  {
    title: "Kemokado",
    description: "Klondike Solitaire, Freecell and Spiderette &mdash; and small enough to fit in a single 32kb Pico-8 cartridge.",
    tags: ["Pico-8"],
    color: "#b701ff",
    icon: "./icons/kemokado.png",
    subtitle: "32kb three-in-one solitaire",
    year: "2020",
    url: "https://kemohaus.itch.io/kemokado"
  },
]

const projects: ProjectProps[] = [
  {
    title: "KEMOHAUS",
    description: `
    <p>A studio focused on cute games. Now published on Steam.</p>
`,
    tags: ["godot"],
    color: "#1a4b5d",
    icon: "./icons/kemohaus.png",
    subtitle: "Game development studio",
    year: "2024",
    url: "https://kemo.haus"
  },
  {
    title: "QRD",
    description: `
    <p>QR code generator. No sign-ups. No link tracking. Just generate a QR code.</p>
`,
    tags: ["vue"],
    color: "#1a4b5d",
    icon: "./icons/qrd.png",
    subtitle: "QR code generator",
    year: "2024",
    url: "https://qrd.fisk.cc"
  },
  {
    title: "Sideshow",
    description: `
    <p>PureRef is not available on the iPad and I can't find anything else I can rely on, so I wrote my own solution. I actually use this, all the time.</p>
    <p>This might be useful for you if you want a reference manager that just works.</p>
`,
    tags: ["nuxt"],
    color: "#ff00c3",
    icon: "./icons/sideshow.png",
    subtitle: "HTML5 reference tool",
    year: "2022-",
    url: "https://sideshow.fisk.cc"
  },
  {
    title: "backpack.tf Next",
    description: `
    <p>The new frontend for backpack.tf. Not sure what to do with it, but it's basically complete.</p>
`,
    tags: ["nuxt"],
    color: "#0080ff",
    icon: "./icons/bptf-next.png",
    subtitle: "Next-gen backpack.tf UI",
    year: "2021-",
    url: "https://next.backpack.tf"
  },
  {
    title: "royale.pet",
    description: `
    <p>Stat reporting for Super Animal Royale. This was made possible by reverse-engineering the game to find where exactly the game stores its leaderboard data.</p>
    <p>royale.pet has been translated into 12 different languages, thanks to community volunteers.</p>
`,
    tags: ["nuxt"],
    color: "#ffa600",
    icon: "./icons/skullcat3.png",
    subtitle: "SAR stat tracking",
    year: "2020",
    url: "https://royale.pet"
  },
  {
    title: "Stats Royale",
    description: `
    <p>I wrote the foundation for the Stats Royale Deck Builder. This allowed players to, with their card collection as an input, find out which cards would form their best possible deck by quantifying the results of actual games played.
     </p>
     <p>New battles were constantly fed into this system for a near-realtime source.</p>
     <p>I haven't worked on Stats Royale in five years - I don't know how much of this remains. But, an interesting project nonetheless.</p>
`,
    tags: ["go", "elasticsearch"],
    color: "#c800ff",
    icon: "./icons/statsroyale.png",
    subtitle: "Deckbuilder Tuning",
    year: "2018",
    defunct: true
  },
  {
    title: "backpack.tf",
    description: `
    <p>It's been going for over a decade!!! I never saw this coming.</p>
`,
    tags: ["php", "typescript"],
    color: "#00bbff",
    icon: "./icons/bptf.png",
    subtitle: "TF2 economy resource",
    year: "2013-",
    url: "https://backpack.tf"
  },
  {
    title: "Bazaar.tf",
    description: `
    <p>Bazaar.tf was a Team Fortress 2 trading platform originally created in collaboration between myself and Accell, an American web designer.</p>
    <p>Bazaar.tf ceased operations in 2023, as increasing API reliability issues made it impossible to feasibly run.</p>
`,
    tags: ["php"],
    color: "#00ffdf",
    icon: "./icons/bazaar.png",
    subtitle: "TF2 trading platform",
    year: "2012-2023",
    defunct: true,
    url: "https://bazaar.tf"
  },
  {
    title: "flop.vegas",
    description: `
    I'm the webmaster for flop.vegas, the website for cool events in Vegas and Southern Utah. I've also done some miscellaneous artwork for the events!!
`,
    tags: ["nuxt"],
    color: "#ff0000",
    icon: "./icons/flop.png",
    subtitle: "Legends of Paradise",
    year: "2023-",
    url: "https://flop.vegas"
  },
]

const contacts = [
  {
    url: "https://github.com/fiskWasTaken",
    name: "GitHub",
    username: "fiskWasTaken"
  },
  {
    url: "https://x.com/__fisk",
    name: "X",
    username: "__fisk"
  },
  {
    url: "mailto:mail@fisk.cc",
    name: "Email",
    username: "mail@fisk.cc"
  },
  {
    url: "https://kemohaus.itch.io",
    name: "Itch.io",
    username: "kemohaus"
  },
  {
    url: "https://ko-fi.com/fisktech",
    name: "Ko-fi",
    username: "fisktech"
  }
]

const merchCollabs = [
  {
    url: "https://www.etsy.com/uk/shop/LemonCremeStudios",
    name: "Stickers",
    username: "Lemon-Crème Studios"
  },
  {
    url: "https://wafflewishes.com",
    name: "Jackets",
    username: "Waffle Wishes"
  },
]
</script>

<style lang="scss">
</style>