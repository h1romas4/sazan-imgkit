
<script setup>
import { ref } from 'vue';
import CropGrid from './components/CropGrid.vue';
const activeTab = ref('cropgrid');
</script>

<template>
<el-tabs
  v-model="activeTab"
  type="border-card"
  style="height: 100vh;"
  class="dark-tabs"
>
    <el-tab-pane label="Crop and Grid" name="cropgrid">
      <CropGrid />
    </el-tab-pane>
  </el-tabs>
</template>

<style>
.dark-tabs {
  background: #181818;
  --el-bg-color: #232323;
  --el-border-color: #232323;
  --el-text-color-primary: #eee;
  --el-text-color-regular: #bbb;
  --el-fill-color-blank: #232323;
  --el-fill-color-light: #232323;
  --el-fill-color-dark: #181818;
}

.dark-tabs .el-tabs__header {
  background: #181818;
  border-bottom: 0;
  margin-bottom: 0;
  box-shadow: 0 2px 8px 0 #000a;
}

.dark-tabs .el-tabs__nav {
  border: none !important;
}

.dark-tabs .el-tabs__item {
  background: #232323 !important;
  color: #bbb !important;
  border: none !important;
  border-radius: 8px 8px 0 0;
  margin-right: 4px;
  padding: 0 24px;
  font-weight: 500;
  letter-spacing: 0.04em;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px 0 #0004;
}

.dark-tabs .el-tabs__item.is-active {
  background: linear-gradient(90deg, #232323 60%, #222 100%) !important;
  color: #42b883 !important;
  box-shadow: 0 4px 16px 0 #42b88333;
  border-bottom: 2px solid #42b883 !important;
  z-index: 2;
}

.dark-tabs .el-tabs__item:not(.is-active):hover {
  background: #24292f !important;
  color: #fff !important;
}

.dark-tabs .el-tabs__active-bar {
  background: #42b883 !important;
  height: 2px !important;
}

.dark-tabs .el-tabs__nav-wrap::after {
  background: none !important;
}

.dark-tabs .el-tabs__nav {
  border: none !important;
  background: transparent !important;
}

.dark-tabs .el-tabs__content {
  background: #232323;
  color: #eee;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 16px 0 #000a;
}

.dark-tabs .el-tabs__content {
  background: #232323;
  color: #eee;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 16px 0 #000a;
}
</style>
