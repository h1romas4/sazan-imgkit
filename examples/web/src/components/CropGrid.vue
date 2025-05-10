<script setup>
import ImageWorkflow from './ImageWorkflow.vue';
import { useCropperState } from '../composables/useCropperState';
import { CropGridService } from '../services/CropGridService';
</script>

<template>
  <ImageWorkflow
    :strategy="CropGridService"
    :composable-factory="useCropperState"
    title="Crop and Grid"
  />
</template>
