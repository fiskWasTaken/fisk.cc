<template>
  <div class="header">
    <div class="header__title" :class="{shakin}" @click="headerClick">fisk</div>
    <audio src="./beat.mp3" ref="beat" />
  </div>
</template>

<style lang="scss" scoped>
.header {
  &__title {
    color: #000;
    font-size: 5em;
    font-family: "Rubik Doodle Shadow",serif;

    &:hover {
      color: #fff;
      background-color: #000;
    }

    &.shakin {
      animation: {
        name: anim;
        duration: 0.1s;
        direction: normal;
        play-state: running;
      }

    }

    cursor: pointer;
  }

  user-select: none;
  height: 300px;
  margin-bottom: 3em;
  display: flex;
  align-items: flex-end;
}

@keyframes anim {
  0% { transform: translate(20px, 0) }
  20% { transform: translate(-20px, 0) }
  40% { transform: translate(10px, 0) }
  60% { transform: translate(-10px, 0) }
  80% { transform: translate(5px, 0) }
  100% { transform: translate(-5px, 0) }
}
</style>

<script setup lang="ts">
import type {Ref} from "vue";

const beat = ref(null) as unknown as Ref<HTMLAudioElement>

const shakin = ref(false)

function headerClick() {
  if (shakin.value) {
    return
  }

  beat.value.play()
  shakin.value = true

  setTimeout(() => {
    shakin.value = false
  }, 300)
}

</script>