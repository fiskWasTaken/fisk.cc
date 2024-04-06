<template>
  <section class="section">
    <div class="section__title">
      <slot name="title"></slot>
    </div>
    <slot>

    </slot>
  </section>
</template>

<style lang="scss" scoped>
.section {
  &__title {
    text-transform: uppercase;
    font-weight: 800;
    text-decoration: {
      color: var(--accent);
    };
    margin-bottom: 1em;
    font-size: 1.4em;
    color: #000;

    border: {
      bottom: {
        width: 1px;
        style: solid;
      };
    }
  }

  margin-bottom: 6em;

  background-color: rgba(255, 255, 255, 0.7);
}
</style>
<script setup lang="ts">
</script>