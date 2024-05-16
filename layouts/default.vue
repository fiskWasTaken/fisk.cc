<template>
  <slot />
</template>

<style lang="scss">
$gutter: 1em;

body {
  background: {
    color: #fff;
  }

  color: #000;
  font-family: "Libre Franklin", serif;
}

.container {
  max-width: 820px;
  margin-left: auto;
  margin-right: auto;
}

.projects-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  row-gap: $gutter;
  column-gap: $gutter;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
}

.text {
  color: #000;

  a {
    color: #674273;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.contact {
  background-color: #000;
  color: #fff;
  text-decoration: none;
  padding: 0.6em 0.8em;
  border: {
    radius: 0.7em;
    width: 1px;
    style: solid;
    color: #000;
  }
  transition: 0.2s;

  &__name {
    font-weight: 600;
  }

  &__username {
    font-weight: 100;
  }

  &:hover {
    background-color: #fff;
    color: #000;
    transform: scale(1.05);
  }

  &:active {
    background-color: #fff;
    color: #000;
  };
}

.contact-links {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  column-gap: $gutter;
  row-gap: $gutter;
}

@font-face {
  font-family: "Rubik Doodle Shadow";
  src: url(@/assets/fonts/Rubik_Doodle_Shadow/RubikDoodleShadow-Regular.ttf);
}

@font-face {
  font-family: "Libre Franklin";
  src: url(@/assets/fonts/Libre_Franklin/LibreFranklin-VariableFont_wght.ttf);
}

@font-face {
  font-family: "Libre Franklin";
  src: url(@/assets/fonts/Libre_Franklin/LibreFranklin-Italic-VariableFont_wght.ttf);
  font-style: italic;
}
</style>
<script setup lang="ts">
</script>