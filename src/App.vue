<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import { ref } from "vue"
import axios from "axios"
import { createSocket, destroySocket } from "./socket/index"
import {
  createCoyoteSocket,
  closeCoyoteSocket,
  sendWaveData,
  qrcodeSrc,
  qrcodeShow,
  addOrIncrease
} from "./socket/coyote"
import { Notyf } from 'notyf'

const notyf = new Notyf({ duration: 3000 })


// API
const api = axios.create({
    baseURL: "http://localhost:3000",
})

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
  const waveData = {
    "test": `["0A0A0A0A00000000","0A0A0A0A00000000","0A0A0A0A00000000","0A0A0A0A00000000","0A0A0A0A00000000","0A0A0A0A00000000","0A0A0A0A00000000","0A0A0A0A00000000","0A0A0A0A01010101","0A0A0A0A01010101","0A0A0A0A22222222","0A0A0A0A22222222","0A0A0A0A43434343","0A0A0A0A43434343","0A0A0A0A64646464","0A0A0A0A64646464"]`
  }
  try {
    sendWaveData(5, 5, waveData["test"], waveData["test"])
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
  <div class="game-tips">
    ! 请在连接前确保已经设置好强度上限
  </div>
  <div>
    <h2>游戏设置</h2>
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
</style>
