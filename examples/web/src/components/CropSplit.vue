<script setup>
import ImageWorkflow from './ImageWorkflow.vue';
import { useCropperState } from '../composables/useCropperState';
import { CropSplitService } from '../services/CropSplitService';
</script>

<template>
  <ImageWorkflow
    :strategy="CropSplitService"
    :composable-factory="useCropperState"
    title="Crop and Split"
  />
</template>
