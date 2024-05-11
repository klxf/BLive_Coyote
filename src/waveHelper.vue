<script setup lang="ts">
import {watch, reactive, ref, Ref} from "vue"
import { Notyf } from 'notyf'

type SliderGroup = {
  sliders: number[];
  autoStrength: boolean;
};

const notyf = new Notyf({ duration: 3000 })

const sliderGroups: Ref<SliderGroup[]> = ref([
  reactive({ sliders: [50, 50, 50, 50], autoStrength: true }),
]);

const inputFrequency = ref(0)

const waveData = ref()

// 监听默认的滑块组
const defaultGroup = sliderGroups.value[0]
watch([() => defaultGroup.sliders[0], () => defaultGroup.sliders[3]], ([first, last]) => {
  // 计算中间两个滑块的值
  if (defaultGroup.autoStrength) {
    defaultGroup.sliders[1] = Math.floor(first + (last - first) / 3)
    defaultGroup.sliders[2] = Math.floor(last - (last - first) / 3)
  }
})

/**
 * 处理频率数据
 */
function frequency() {
  let frequency: number;
  if (inputFrequency.value >= 10 && inputFrequency.value < 100) {
    frequency = inputFrequency.value
  } else if (inputFrequency.value >= 101 && inputFrequency.value < 600) {
    frequency = (inputFrequency.value - 100)/5 + 100
  } else if (inputFrequency.value >= 601 && inputFrequency.value <= 1000) {
    frequency = (inputFrequency.value - 600)/10 + 200
  } else {
    frequency = 10
  }

  return Math.floor(frequency)
}

/**
 * 处理强度数据
 */
function strength() {
  // 获取两个 group
  const groups = document.querySelectorAll('.group')
  const strength: number[][] = []
  groups.forEach(group => {
    const sliders = group.querySelectorAll('.slider')
    const groupStrength: number[] = []
    sliders.forEach(slider => {
      groupStrength.push(Number((slider as HTMLInputElement).value))
    })
    strength.push(groupStrength)
  })
  console.log(strength)
  return strength
}

/**
 * 处理强度数据
 */
function convertStrength(input) {
  return input.map(value => {
    const hexValue = parseInt(value).toString(16).padStart(2, "0").toUpperCase();
    return hexValue.repeat(4);
  }).reduce((acc, val) => acc.concat([val, val]), []);
}

/**
 * 组合数据
 */
function combineData() {
  const frequencyValues = frequency()
  const strengthValues = strength()

  // 将 frequencyValues 转为两位十六进制
  const frequencyHEX = frequencyValues.toString(16).padStart(2, "0").repeat(4).toUpperCase()

  // 将 strengthValues 转为两位十六进制
  // const strengthHEX = strengthValues.map(group => {
  //   return group.map(value => {
  //     return parseInt(value).toString(16).padStart(2, "0").toUpperCase()
  //   }).join('')
  // })
  const strengthHEX = strengthValues.map(group => {
    return convertStrength(group)
  }).flat()

  waveData.value = strengthHEX.map(group => {
    return (frequencyHEX + group)
  })

  console.log(waveData.value)
}

/**
 * 新建滑块分组
 */
function newGroup() {
  const newGroup = reactive({ sliders: [50, 50, 50, 50], autoStrength: true })
  sliderGroups.value.push(newGroup)

  // 监听第一个和最后一个滑块的值
  watch([() => newGroup.sliders[0], () => newGroup.sliders[3]], ([first, last]) => {
    if (newGroup.autoStrength) {
      // 计算中间两个滑块的值
      newGroup.sliders[1] = Math.floor(first + (last - first) / 3)
      newGroup.sliders[2] = Math.floor(last - (last - first) / 3)
    }
  })
}

/**
 * 删除滑块分组
 */
function deleteGroup(index: number) {
  sliderGroups.value.splice(index, 1)
}

</script>

<template>
  <div>
    <h2>波形助手</h2>
    <div>
      <h3>频率</h3>
      <!-- 两个滑块的滑轨 -->
      <input type="range" min="10" max="1000" step="1" v-model="inputFrequency"/>

      <input type="number" placeholder="填写频率" v-model="inputFrequency"/>
      <h3>强度</h3>
      <div id="sliders">
        <div class="group" v-for="(group, index) in sliderGroups" :key="index">
          <button @click="deleteGroup(index)" style="position: absolute; padding: revert;">X</button>
          <span style="position: absolute; margin-left: 32px;"><input type="checkbox" v-model="group.autoStrength">Auto</span>
          <input type="range" min="0" max="100" v-model.number="group.sliders[0]" class="slider">
          <input type="range" min="0" max="100" v-model.number="group.sliders[1]" class="slider" :disabled="group.autoStrength">
          <input type="range" min="0" max="100" v-model.number="group.sliders[2]" class="slider" :disabled="group.autoStrength">
          <input type="range" min="0" max="100" v-model.number="group.sliders[3]" class="slider">
        </div>
      </div>
    </div>
    <button @click="combineData">获取波形数据</button>
    <button @click="newGroup">新建分组</button>
    <div v-if="waveData">
      <h3>波形数据</h3>
      <div style="overflow-x: scroll;">{{ JSON.stringify(waveData) }}</div>
    </div>
  </div>
</template>

<style>
#app {
  color: #fff;
  margin: 60px 50px;
}
#sliders {
  display: flex;
  justify-content: flex-start;
}

.slider {
  writing-mode: bt-lr; /* IE */
  -webkit-appearance: slider-vertical; /* WebKit */
  margin-top: 26px;
  width: 8px;
  height: 200px;
  padding: 0 5px;
}

</style>
