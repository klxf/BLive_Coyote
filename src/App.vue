<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import {computed, ref, watch} from "vue"
import axios from "axios"
import { Notyf } from 'notyf'
import { createSocket, destroySocket } from "./socket/index"
import {
  createCoyoteSocket,
  closeCoyoteSocket,
  addOrIncrease,
  sendWaveData,
  coyoteState,
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
const settings_text = localStorage.getItem('settings') || ''
const settings_version = 1
let showUpgrade = ref(false)
if (window.localStorage.getItem("settings")) {
  settings.value = JSON.parse(window.localStorage.getItem("settings") || '{}')
  if (settings.value.version != settings_version) {
    // 如果版本不一致，则提示是否修复
    showUpgrade.value = true
  }
  // console.log(settings.value)
} else {
  // 如果没有，使用默认值并且保存
  settings.value = {
    version: 1,
    waveData: waveData,
    strengthData: strengthData,
    guardLevel: 0,
    fansMedal: false
  };
  window.localStorage.setItem('settings', JSON.stringify(settings.value));
}
let showSafetyNotice = ref(localStorage.getItem('showSafetyNotice') !== 'false')

const upgradeSettings = () => {
  // 目前结构没变化，所以补全不存在的项就行了
  const old_settings = JSON.parse(window.localStorage.getItem("settings") || '{}')
  const old_waveData = old_settings?.waveData ? old_settings.waveData : waveData
  const old_strengthData = old_settings?.strengthData ? old_settings.strengthData : strengthData
  const old_guardLevel = old_settings?.guardLevel ? old_settings.guardLevel : "0"
  const old_fansMedal = old_settings?.fansMedal ? old_settings.fansMedal : false

  settings.value = {
    version: settings_version,
    waveData: old_waveData,
    strengthData: old_strengthData,
    guardLevel: old_guardLevel,
    fansMedal: old_fansMedal
  }

  window.localStorage.setItem('settings', JSON.stringify(settings.value));

  console.log(settings.value)

  showUpgrade.value = false
  notyf.success("升级成功")
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

// 连接状态
const gameState = ref(false)

const selectedGift = ref('')
const selectedWave = ref('')
const relations = ref(Object.entries(giftData).map(([key, value]) => ({ gift: key, wave: settings.value.waveData[key] })))

// 安全须知相关
let canAcknowledgeSafetyNotice = ref(false)
let canAcknowledgeSafetyNoticeCountdown = ref(15)
let canAcknowledgeSafetyNoticeTimer = setInterval(() => {
  canAcknowledgeSafetyNoticeCountdown.value--
  if (canAcknowledgeSafetyNoticeCountdown.value <= 0) {
    canAcknowledgeSafetyNotice.value = true
    clearInterval(canAcknowledgeSafetyNoticeTimer)
  }
}, 1000)

let safetyNotices = ref([
  "<b>请保证在安全、清醒、自愿的情况下使用</b>",
  "严禁<b>体内存在电子/金属植入物者、心脑血管疾病患者、孕妇、儿童或无法及时操作主机</b>的人群使用",
  "严禁将电极置于<b>心脏投影区</b>（或任何可能使电流经过心脏的位置），以及<b>头部、颈部、皮肤破损处</b>等位置",
  "严禁在驾驶或操纵机器等危险情况下使用",
  "请勿在同一部位连续使用<b>30分钟以上</b>，以免造成损伤",
  "请勿在<b>输出状态下</b>移动电极，以免造成刺痛或灼伤",
  "在直播过程中使用<b>可能会导致直播间被封禁</b>，风险自负",
  "在使用前需要<b>完整阅读郊狼产品安全须知，并设置好强度上限保护</b>",
])

watch(selectedGift, (newGift) => {
  selectedWave.value = waveData[newGift]
})

const fansMedal = computed({
  get: () => settings.value.fansMedal,
  set: (value) => { settings.value.fansMedal = value === 'true' }
});

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
          gameState.value = true
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
          gameState.value = false
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

/**
 * 阅读安全须知
 */
const acknowledgeSafetyNotice = () => {
  showSafetyNotice.value = false
  localStorage.setItem('showSafetyNotice', 'false')
}

/**
 * 将数字大航海等级转换为文字
 */
const guardLevelText = computed(() => {
  switch (settings.value.guardLevel) {
    case "0":
      return "观众";
    case "1":
      return "舰长";
    case "2":
      return "提督";
    case "3":
      return "总督";
    default:
      return "未知";
  }
})
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

  <div class="settings-window-bg" v-show="showUpgrade || showSettings || showSafetyNotice"></div>

  <div class="settings-window" v-show="showUpgrade">
    <h2>⚠ 本地设置数据升级</h2>
    <p>
      目前可读取的本地设置数据的储存结构版本为<input class="tag" v-model="settings_version" size="1" disabled>，你的设备上现有的设置数据的储存结构版本为<input class="tag" v-model="settings.version" size="1" disabled>。
    </p>
    <p>
      为了可以安全使用 BLive Coyote，现在需要将你设备上储存的设置数据进行升级，这个过程通常可以自动进行，如果出现意外请联系开发者。
    </p>
    <hr />
    <p>【注意】下面是你的全部设置数据，请先复制下面的全部内容，以确保在升级失败时可以恢复！</p>
    <textarea v-model="settings_text" style="width: 100%; height: 64px;"></textarea>
    <div class="form">
      <button @click="upgradeSettings">尝试执行升级</button>
    </div>
  </div>

  <div class="settings-window" v-show="showSafetyNotice">
    <h2>⚠ 安全须知</h2>
    <p v-for="(notice, index) in safetyNotices"
       :key="index" class="animated-notice"
       :style="`animation-delay: ${index*2}s`"
       v-html="notice">
    </p>
    <hr />
    <p>【注意】请仔细阅读以上内容后，点击“<b>我已知晓</b>”</p>
    <div class="form">
      <button @click="acknowledgeSafetyNotice" :disabled="!canAcknowledgeSafetyNotice">
        我已知晓{{canAcknowledgeSafetyNoticeCountdown != 0 ? "（" + canAcknowledgeSafetyNoticeCountdown + "）" : ""}}
      </button>
    </div>
  </div>

  <div class="settings-window" v-show="showSettings">
    <button @click="showSettings = false" style="float: right">关</button>
    <button @click="saveSettings" style="float: right">存</button>
    <div>
      <h2>大航海</h2>
      <p>
        身份至低为
        <select v-model="settings.guardLevel">
          <option value="0">观众</option>
          <option value="1">舰长</option>
          <option value="2">提督</option>
          <option value="3">总督</option>
        </select>
        且
        <select v-model="fansMedal">
          <option value="true">需要</option>
          <option value="false">不需要</option>
        </select>
        佩戴粉丝牌才可互动
      </p>

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
    <h3>大航海</h3>
    <p>
      身份至低为
      <input class="tag" v-model="guardLevelText" size="1" disabled>
      且
      <span class="tag">{{ settings["fansMedal"] ? "需要" : "不需要" }}</span>
      佩戴粉丝牌才可互动
    </p>
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
          <input class="tag" v-model="giftData[relation.gift]" size="8" disabled>
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
      <button @click="gameStart" v-show="!gameState">游戏开始</button>
      <button @click="gameEnd" v-show="gameState">游戏结束</button>
      <button @click="createCoyoteSocket" v-show="!coyoteState">连接郊狼</button>
      <button @click="closeCoyoteSocket" v-show="coyoteState">断开郊狼</button>
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
</style>
