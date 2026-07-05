<template>
  <div id="editor-sidebar" :class="{ hidden: !isOpen }">
    <div class="editor-header">
      <span>Fountain プレビュー</span>
      <button class="editor-close" @click="$emit('update:isOpen', false)" title="閉じる">×</button>
    </div>
    <textarea 
      id="script-input" 
      readonly 
      :value="store.fountainOutput" 
      placeholder="ここにFountain形式の脚本が出力されます..."
    ></textarea>
  </div>
</template>

<script setup>
import { store } from '../store'
const props = defineProps(['isOpen'])
const emit = defineEmits(['update:isOpen'])
</script>
