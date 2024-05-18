<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import { ref, watch } from "vue"
import axios from "axios"
import { Notyf } from 'notyf'
import { createSocket, destroySocket } from "./socket/index"
import {
  createCoyoteSocket,
  closeCoyoteSocket,
  addOrIncrease,
  sendWaveData,
  qrcodeSrc,
  qrcodeShow,
  channelAStrength,
  channelBStrength,
  softAStrength,
  softBStrength,
  followAStrength,
  followBStrength
} from "./socket/coyote"
import { waveData, strengthData, giftData } from "./assets/dataMap";

const notyf = new Notyf({ duration: 3000 })

// API
const api = axios.create({
    baseURL: "http://localhost:3000",
})

//读取本地储存数据
let settings = ref()
if (window.localStorage.getItem("settings")) {
  settings.value = JSON.parse(window.localStorage.getItem("settings") || '{}');
  // console.log(settings.value)
} else {
  // 如果没有，使用默认值
  settings.value = {
    waveData: waveData,
    strengthData: strengthData
  };
}


// 替换你的主播身份码
const codeId = ref("")
// 替换你的app应用 [这里测试为互动游戏]
const appId = ref("")
// [向 node server请求接口后自动返回]
const gameId = ref("")
// v2改为server response 服务器返回websocket信息，而非手动获取
const authBody = ref("")
const wssLinks = ref([])
// heartBeat Timer
const heartBeatTimer = ref<NodeJS.Timer>()
// be ready
clearInterval(heartBeatTimer.value!)
// 测试波形数据
const waveTestData = ref("")
// 显示设置窗口
const showSettings = ref(false)

const selectedGift = ref('')
const selectedWave = ref('')
const relations = ref(Object.entries(giftData).map(([key, value]) => ({ gift: key, wave: settings.value.waveData[key] })))

// console.log(relations.value)

watch(selectedGift, (newGift) => {
  selectedWave.value = waveData[newGift]
})


/**
 * 测试请求鉴权接口
 */
const getAuth = () => {
  api.post("/getAuth", {})
      .then(({ data }) => {
        console.log("-----鉴权成功-----")
        notyf.success({ message: "鉴权成功" })
      })
      .catch((err) => {
        console.log("-----鉴权失败-----")
        notyf.error({ message: "鉴权失败" })
      })
}

const heartBeatThis = (game_id) => {
    // 心跳 是否成功
    api.post("/gameHeartBeat", {
        game_id,
    })
        .then(({ data }) => {
            console.log("-----心跳成功-----")
            console.log("返回：", data)
        })
        .catch((err) => {
            console.log("-----心跳失败-----")
        })
}

/**
 * @comment 注意所有的接口基于鉴权成功后才能正确返回
 * 测试请求游戏开启接口
 */
const gameStart = () => {
  api.post("/gameStart", {
    code: codeId.value,
    app_id: Number(appId.value),
  })
      .then(({ data }) => {
        if (data.code === 0) {
          const res = data.data
          const { game_info, websocket_info } = res
          const { auth_body, wss_link } = websocket_info
          authBody.value = auth_body
          wssLinks.value = wss_link
          console.log("-----游戏开始成功-----")
          console.log("返回GameId：", game_info)
          notyf.success({ message: "游戏开始成功" })
          gameId.value = game_info.game_id
          // v2改为20s请求心跳一次，不然60s会自动关闭
          heartBeatTimer.value = setInterval(() => {
            heartBeatThis(game_info.game_id)
          }, 20000)
          handleCreateSocket()
        } else {
          console.log("-----游戏开始失败-----")
          console.log("原因：", data)
          notyf.error({ message: "游戏开始失败" })
        }
      })
      .catch((err) => {
        console.log("-----游戏开始失败-----")
        console.log(err)
        notyf.error({ message: "游戏开始失败" })
      })
}

/**
 * @comment 基于gameStart成功后才会关闭正常，否则获取不到game_id
 * 测试请求游戏关闭接口
 */
const gameEnd = () => {
  api.post("/gameEnd", {
    game_id: gameId.value,
    app_id: Number(appId.value),
  })
      .then(({ data }) => {
        if (data.code === 0) {
          console.log("-----游戏关闭成功-----")
          console.log("返回：", data)
          // 清空长链
          authBody.value = ""
          wssLinks.value = []
          clearInterval(heartBeatTimer.value!)      // 这里会报个错误，加了个非空断言
          handleDestroySocket()
          console.log("-----心跳关闭成功-----")
          notyf.success({ message: "游戏关闭成功" })
        } else {
          console.log("-----游戏关闭失败-----")
          console.log("原因：", data)
          notyf.error({ message: "游戏关闭失败" })
        }
      })
      .catch((err) => {
        console.log("-----游戏关闭失败-----")
        console.log(err)
        notyf.error({ message: "游戏关闭失败" })
      })
}

/**
 * 测试创建长长连接接口
 */
const handleCreateSocket = () => {
  if (authBody.value && wssLinks.value) {
    createSocket(authBody.value, wssLinks.value)
    console.log("-----长连接创建成功-----")
  }
}

/**
 * 测试销毁长长连接接口
 */
const handleDestroySocket = () => {
  destroySocket()
  console.log("-----长连接销毁成功-----")
}

/**
 * 测试按钮
 */
const test = () => {
  try {
    sendWaveData(5, 5, waveTestData.value, waveTestData.value)
    addOrIncrease(2, 1, 1)
    console.log(waveTestData.value)
    notyf.success("波形发送成功")
  }
  catch (e) {
    console.log(e)
    notyf.error("操作失败！")
  }
}

/**
 * 显示二维码
 */
const showqrcode = () => {
  qrcodeShow.value = true;
}

/**
 * 隐藏二维码
 */
const hideqrcode = () => {
  qrcodeShow.value = false;
}

/**
 * 保存设置
 */
const saveSettings = () => {
  window.localStorage.setItem('settings', JSON.stringify(settings.value));
  console.log(settings.value);
}

/**
 * 添加并保存 waveData
 */
const addRelationAndSave = () => {
  // 检查是否已经存在一个关系
  const existingRelation = relations.value.find(relation => relation.gift === selectedGift.value);

  if (existingRelation) {
    // 如果存在，更新它
    existingRelation.wave = selectedWave.value;
  } else {
    // 如果不存在，创建一个新的关系
    relations.value.push({ gift: selectedGift.value, wave: selectedWave.value });
  }

  // 保存新的关系到 settings.waveData
  settings.value.waveData[selectedGift.value] = selectedWave.value;
  console.log(settings.value.waveData)

  // 保存设置
  saveSettings();
}
</script>

<template>
  <div id="qrcode-overlay" v-show="qrcodeShow">
    <div id="qrcode-container">
      <div id="qrcode-text">
        <p>使用DG-LAB APP扫码建立WebSocket链接</p>
        <p>请先开始游戏与直播间建立连接</p>
      </div>
      <div id="qrcode-img">
        <img id="qrcode" :src="qrcodeSrc">
      </div>
      <div class="close-qrcode" @click="hideqrcode">关闭</div>
    </div>
  </div>

  <div class="settings-window" v-show="showSettings">
    <button @click="showSettings = false" style="float: right">关</button>
    <div>
      <h2>强度规则</h2>

      <p>礼物规则 <u title="收到指定礼物后将更新强度">?</u></p>
      <div>
        赠送
        <select name="addStrengthGift" id="addStrengthGift" v-model="settings.strengthData[0]">
          <option v-for="(value, key) in giftData" :value="key">
            {{ value }}
          </option>
        </select>
        使强度 +1
      </div>
      <div>
        赠送
        <select name="subStrengthGift" id="subStrengthGift" v-model="settings.strengthData[1]">
          <option v-for="(value, key) in giftData" :value="key">
            {{ value }}
          </option>
        </select>
        使强度 -1
      </div>

      <p>强度跟随 <u title="开启后对应强度将自动跟随软上限变化">?</u></p>
      <div style="display: flex">
        A<input type="checkbox" v-model="followAStrength" />

        B<input type="checkbox" v-model="followBStrength" />
      </div>

      <button @click="saveSettings">保存</button>

      <h2>波形规则</h2>
      <div>
        <div v-for="relation in relations" :key="relation.gift">
          <div v-if="relation && relation.wave">
            赠送
            <span class="tag"> {{ giftData[relation.gift] }} </span>
            输出波形
            <input class="tag" v-model="relation.wave" disabled>
          </div>
        </div>

        <div>
          <div>
            赠送
            <select v-model="selectedGift">
              <option v-for="(value, key) in giftData" :value="key">
                {{ value }}
              </option>
            </select>
            输出波形
            <input v-model="selectedWave">
          </div>
          <a onclick="window.open('waveHelper.html', '', 'width=500,height=1000,left=700');">波形助手</a>
        </div>
        <button @click="addRelationAndSave">新建或保存</button>
      </div>
    </div>
  </div>

  <div class="game-tips">
    ! 请在连接前确保已经设置好强度上限
  </div>

  <div class="game-info">
    <h2>主机状态</h2>

    <div style="display: flex">
      <div class="channel-circle">
        <div class="channel-tag">A</div>
        <div class="channel-strength">{{ channelAStrength }}</div>
        <div class="soft-strength">{{ softAStrength }}</div>
      </div>
      <div class="channel-circle">
        <div class="channel-tag">B</div>
        <div class="channel-strength">{{ channelBStrength }}</div>
        <div class="soft-strength">{{ softBStrength }}</div>
      </div>
    </div>

    <hr />

    <h2>游戏玩法</h2>
    <h3>强度控制</h3>
    <p>
      赠送
      <img :src="'/img/' + settings.strengthData[0] + '.png'" width="24" :alt="giftData[settings.strengthData[0]]">
      <input class="tag" v-model="giftData[settings.strengthData[0]]" size="6" disabled>
      强度 +1
    </p>
    <p>
      赠送
      <img :src="'/img/' + settings.strengthData[1] + '.png'" width="24" :alt="giftData[settings.strengthData[1]]">
      <input class="tag" v-model="giftData[settings.strengthData[1]]" size="6" disabled>
      强度 -1
    </p>

    <h3>波形控制</h3>
    <div>
      <p>赠送如下礼物可输出波形</p>
      <div v-for="relation in relations" :key="relation.gift">
        <div v-if="relation && relation.wave">
          <img :src="'/img/' + relation.gift + '.png'" width="24" :alt="giftData[relation.gift]">
          <input class="tag" v-model="giftData[relation.gift]" disabled>
        </div>
      </div>
    </div>



    <button @click="showSettings = true">修改玩法</button>
  </div>
  <div>
    <h2>系统设置</h2>
    <div class="form">
      <label>主播身份码</label>
      <input type="password" placeholder="填写主播身份码" v-model="codeId"/>
      <label>app_id</label>
      <input type="text" placeholder="填写 app_id" v-model="appId" />
      <button @click="gameStart">游戏开始</button>
      <button @click="gameEnd">游戏结束</button>
      <button @click="createCoyoteSocket">连接郊狼</button>
      <button @click="closeCoyoteSocket">断开郊狼</button>
    </div>

    <hr />

    <h2>调试选项</h2>
    <div class="form">
      <button @click="getAuth">鉴权</button>
      <label>波形数组 <a onclick="window.open('waveHelper.html', '', 'width=500,height=1000,left=700');">波形助手</a></label>
      <input type="text" placeholder="填写欲测试的波形数组" v-model="waveTestData" />
      <button @click="test">测试</button>
    </div>
  </div>
</template>

<style>
#app {
  color: #fff;
  margin: 60px 50px;
}
.form {
  display: flex;
  flex-direction: column;
}
.form input,
.form button {
  width: 300px;
  height: 50px;
  margin: 10px 0;
  font-size: 18px;
}

.settings-window {
  position: fixed;
  top: 10%;
  bottom: 10%;
  height: 500px;
  left: 10%;
  right: 10%;
  background-color: #171717;
  border-radius: 20px;
  border: #ffe99d 2px solid;
  z-index: 100;
  padding: 20px;
}

.tag {
  background: #fce9a7;
  color: #000;
  border-radius: 5px;
}
</style>
