import DanmakuWebSocket from "../assets/danmaku-websocket.min.js"
import { Notyf } from 'notyf'
import { closeCoyoteSocket, addOrIncrease, sendWaveData } from "./coyote"
import { waveData, strengthData } from "../assets/dataMap";
import { Ref, ref } from "vue";

let ws: DanmakuWebSocket
const notyf = new Notyf({ duration: 4000 })

interface SettingsType {
    strengthData: typeof strengthData;
    waveData: typeof waveData;
    guardLevel: number;
}

let settings: Ref<SettingsType> = ref({
    waveData: waveData,
    strengthData: strengthData,
    guardLevel: 0
});

if (window.localStorage.getItem("settings")) {
    settings.value = JSON.parse(window.localStorage.getItem("settings") || '{}');
    console.log(settings.value)
} else {
    // 如果没有，使用默认值
    settings.value = {
        waveData: waveData,
        strengthData: strengthData,
        guardLevel: 0
    };
}

/**
 * 创建socket长连接
 * @param authBody
 * @param wssLinks
 */
function createSocket(authBody: string, wssLinks: string[]) {
    const opt = {
        ...getWebSocketConfig(authBody, wssLinks),
        // 收到消息,
        onReceivedMessage: (res) => {
            console.log("收到"+ res.cmd +"消息：")
            //console.log(res.data.uname + "（大航海" +res.data.guard_level + "级）：" + res.data.msg)

            // if (res.data.msg == "#UPA1") {
            //     try {
            //         addOrIncrease(2, 1, 1)
            //         notyf.success("A通道强度增加成功")
            //     }
            //     catch (e) {
            //         console.log(e)
            //         notyf.error("A通道强度增加失败")
            //     }
            // }

            settings = window.localStorage.getItem("settings") ? ref(JSON.parse(window.localStorage.getItem("settings") || '{}')) : null

            if (res.cmd == "LIVE_OPEN_PLATFORM_SEND_GIFT" && res.data.guard_level >= settings.value.guardLevel) {
                if (settings && res.data.gift_id.toString() === settings.value.strengthData[0]) {
                    // 牛哇牛哇：加强度1
                    try {
                        console.log("开始操作")
                        addOrIncrease(2, 1, 1)
                        addOrIncrease(2, 2, 1)
                        console.log("结束操作")
                        notyf.success("收到" + res.data.gift_name + "，强度+1")
                    }
                    catch (e) {
                        console.log(e)
                        notyf.error("强度操作失败！")
                    }
                } else if (settings && res.data.gift_id.toString() === settings.value.strengthData[1]) {
                    // 小花花：减强度1
                    try {
                        addOrIncrease(1, 1, 1)
                        addOrIncrease(1, 2, 1)
                        notyf.success("收到" + res.data.gift_name + "，强度-1")
                    }
                    catch (e) {
                        console.log(e)
                        notyf.error("强度操作失败！")
                    }
                } else if(settings && settings.value.waveData[res.data.gift_id]) {
                    // 其他礼物，发送波形数据
                    try {
                        sendWaveData(5, 5, settings.value.waveData[res.data.gift_id], settings.value.waveData[res.data.gift_id])
                        notyf.success("收到礼物" + res.data.gift_name)
                    }
                    catch (e) {
                        console.log(e)
                        notyf.error("发送波形数据失败！")
                    }
                }
            }

            console.log(res)
        },
        // 收到心跳处理回调
        onHeartBeatReply: (data) => console.log("收到心跳处理回调:", data),
        onError: (data) => console.log("error", data),
        onListConnectError: () => {
            console.log("list connect error")
            destroySocket()
        },
    }

    if (!ws) {
        ws = new DanmakuWebSocket(opt)
    }

    return ws
}

/**
 * 获取websocket配置信息
 * @param authBody
 * @param wssLinks
 */
function getWebSocketConfig(authBody: string, wssLinks: string[]) {
    const url = wssLinks[0]
    const urlList = wssLinks
    const auth_body = JSON.parse(authBody)
    return {
        url,
        urlList,
        customAuthParam: [
            {
                key: "key",
                value: auth_body.key,
                type: "string",
            },
            {
                key: "group",
                value: auth_body.group,
                type: "string",
            },
        ],
        rid: auth_body.roomid,
        protover: auth_body.protoover,
        uid: auth_body.uid,
    }
}

/**
 * 销毁websocket
 */
function destroySocket() {
    console.log("destroy1")
    ws && ws.destroy()
    ws = undefined
    console.log("destroy2")
}

/**
 * 获取websocket实例
 */
function getWsClient() {
    return ws
}

export { createSocket, destroySocket, getWebSocketConfig, getWsClient }
