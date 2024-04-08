<template>
  <Tooltip placement="bottom">
    <a class="project" :class="{ 'defunct': defunct}" :style="{'--accent': color}" :href="url ?? '#'">
      <div class="project__image" :style="{'background-image': `url(${icon})`}">

      </div>
      <div class="project__right">
        <div class="project__name">
          {{ title }}
        </div>
        <div class="project__subtitle">
          {{ subtitle }}
        </div>
      </div>
    </a>
    <template #content>
      <div class="selected-project-dialog dialog">
        <div class="dialog__defunct" v-if="defunct">
          This project was retired.
        </div>
        <div class="dialog__content">
          <div class="dialog__header">
            <div class="dialog__title">
              {{ title }}
            </div>
            <div class="dialog__technologies">
              <div class="dialog__technology" v-for="tag in tags">
                {{ tag }}
              </div>
            </div>
          </div>
          <div class="dialog__description" v-html="description" />
        </div>

      </div>
    </template>
  </Tooltip>

</template>

<style lang="scss" scoped>
$defunct: #c25900;

.dialog {
  &__header {
    background-color: #000;
    padding: 0.5em 1em;
  }

  &__title {
    font-weight: bold;
    color: #fff;
  }

  &__content {
  }

  &__description {
    font-size: 0.9em;
    color: #333;
    padding: 1em;

    :deep(p) {
      margin: 0 0 1em;

      &:last-of-type {
        margin: 0;
      }
    }
  }

  &__defunct {
    background-color: $defunct;
    color: #fff;
    padding: 0.5em 1em;
    font-size: 0.8em;
  }

  &__technologies {
    display: flex;
  }

  &__technology {
    margin-right: 1ch;
    font-size: 0.6em;
    text-transform: uppercase;
    color: #aaa;
  }

  background-color: #fff;
  box-shadow: 1px 1px 16px #000;
  border-radius: 0.4em;
  overflow: hidden;
  max-width: 400px;
}

.project {
  width: 400px;
  height: 100px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.3s, color 0.3s;
  cursor: pointer;
  overflow: hidden;
  text-decoration: none;

  color: #000;
  user-select: none;

  @media (max-width: 850px) {
    width: 100%;
  }

  border: {
    radius: 1em;
    width: 1px;
    color: #000;
    style: solid;
  }

  &__image {
    width: 90px;
    height: 90px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    margin: 0.3em;
    border-radius: 0.8em;
  }

  &__right {
    margin: 0.5em;
    text-align: right;
  }

  &__name {
    font-size: 1.4em;
    font-weight: 600;
  }

  &__subtitle {
    font-size: 0.9em;
    font-weight: 100;
  }

  &:hover {
    color: #fff;
    background-color: #000;
    transform: scale(1.05);
  }

  &:active {
    color: #000;
    background-color: #fff;
    transform: scale(0.95);
  }
}
</style>
<script setup lang="ts">
import Tooltip from "~/components/Tooltip.vue";

export interface ProjectProps {
  title: string
  description: string,
  icon: string,
  defunct?: boolean,
  tags: string[],
  color: string,
  year: string,
  subtitle: string,
  url?: string
}

const props = defineProps<ProjectProps>()
</script>