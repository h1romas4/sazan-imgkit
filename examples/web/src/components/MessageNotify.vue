<script setup>
import { watch } from 'vue';
import { ElMessage } from 'element-plus';

/**
 * MessageNotify component
 * Watches the `message` and `type` props and displays notification using Element Plus ElMessage.
 * Supports 'error', 'info', 'success', 'warning'.
 *
 * @prop {string|null} message - The message to display. If null, nothing is shown.
 * @prop {'error'|'info'|'success'|'warning'} [type='info'] - The type of message.
 */
const props = defineProps({
  message: {
    type: String,
    default: null,
  },
  type: {
    type: String,
    default: 'info',
    validator: v => ['error', 'info', 'success', 'warning'].includes(v),
  },
});

watch(
  () => [props.message, props.type],
  ([msg, type]) => {
    if (msg) {
      ElMessage({ message: msg, type });
    }
  }
);
</script>
<template></template>
