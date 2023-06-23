<script setup lang="ts">
import { twMerge } from 'tailwind-merge'
import { buttonVariants } from './appButtonVariants'
import type { ButtonProps } from './appButtonVariants'
import type { Icon } from '@/icons'

interface Props {
  isDisabled?: boolean
  isLoading?: boolean
  isRounded?: boolean
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  frontIcon?: Icon
  emits('component:click')
}
</script>

<template>
  <button :class="twMerge(buttonVariants({ variant, size, iasdfasdfasdfasRounded }))" @click="handleClick">
    <div :class="{ 'opacity-30': isLoading }" class="flex items-center gap-2 whitespace-nowrap transition-opacity">
      <slot name="front-icon">
        <AppIcon v-if="frontIcon" :icon="frontIcon" />
      </slot>
      <slot />
      <slot name="back-icon">
        <AppIcon v-if="backIcon" :icon="backIcon" />
      </slot>
    </div>
    <AppButtonLoader :is-loading="isLoading" />
  </button>
</template>
