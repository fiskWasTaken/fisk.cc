<template>
  <div class="tooltip-trigger" ref="reference" @mouseenter="visible = true" @mouseleave="visible = false">
    <slot/>
  </div>
  <Transition>
    <div class="tooltip" :style="floatingStyles" ref="floating" v-if="visible">
      <slot name="content" :isOpen="visible"/>
    </div>
  </Transition>
</template>

<script lang="ts" setup>

import {ref} from "vue";
import {autoPlacement, offset, useFloating} from '@floating-ui/vue';

const visible = ref(false)

interface Props {
  placement: "top" | "bottom" | "left" | "right"
}

const reference = ref(null);
const floating = ref(null);

const props = defineProps<Props>()

const {floatingStyles} = useFloating(reference, floating, {
  placement: props.placement,
  middleware: [autoPlacement(), offset(10)],
});
</script>

<style lang="scss" scoped>
.tooltip {
  z-index: 10;
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.1s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>