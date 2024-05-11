import {ref} from "vue";
import { Notyf } from 'notyf'
import QRCode from 'qrcode'

const notyf = new Notyf({ duration: 4000 })

let channelAStrength = 0; // A通道强度
let channelBStrength = 0; // B通道强度

let connectionId = ""; // 从接口获取的连接标识符
let targetWSId = ""; // 发送目标
let fangdou = 500; //500毫秒防抖
let fangdouSetTimeOut; // 防抖定时器
let followAStrength = false; //跟随AB软上限
let followBStrength = false;
let wsConn; // 全局ws链接
const feedBackMsg = {
    "feedback-0": "A通道：○",
    "feedback-1": "A通道：△",
    "feedback-2": "A通道：□",
    "feedback-3": "A通道：☆",
    "feedback-4": "A通道：⬡",
    "feedback-5": "B通道：○",
    "feedback-6": "B通道：△",
    "feedback-7": "B通道：□",
    "feedback-8": "B通道：☆",
    "feedback-9": "B通道：⬡",
}

const qrcodeSrc = ref("")
const qrcodeShow = ref(false)
QRCode.toDataURL("https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#wss://coyote.babyfang.cn/", function (err, url) {
    //console.log(url)
    qrcodeSrc.value = url
})

function createCoyoteSocket() {
    wsConn = new WebSocket('wss://coyote.babyfang.cn/');
    wsConn.onopen = function (event) {
        console.log("WebSocket连接已建立");
    }

    wsConn.onmessage = function (event) {
        let msg = {} as any
        try {
            msg = JSON.parse(event.data);
        } catch (e) {
            console.log(event.data);
            return;
        }

        console.log(event.data)

        switch (msg.type) {
            case 'bind':
                if (!msg.targetId) {
                    connectionId = msg.clientId;
                    console.log(`收到clientId：${connectionId}`);
                    QRCode.toDataURL("https://www.dungeon-lab.com/app-download.php#DGLAB-SOCKET#wss://coyote.babyfang.cn/" + connectionId, function (err, url) {
                        //console.log(url)
                        qrcodeSrc.value = url
                    })
                    qrcodeShow.value = true
                } else {
                    if (msg.clientId != connectionId) {
                        console.log("错误的clientId")
                        return;
                    }
                    targetWSId = msg.targetId;
                    console.log("收到targetId: " + msg.targetId + ", msg: " + msg.message);
                    qrcodeShow.value = false
                    notyf.success({message: "郊狼连接成功"})
                }
                break;
            case 'break':
                if (msg.targetId != targetWSId)
                    return;
                console.log("收到断开连接指令")
                notyf.error({ message: "收到断开连接指令" })
                //location.reload();
                break;
            case 'error':
                if (msg.targetId != targetWSId)
                    return;
                console.log("对方已断开，code：" + msg.message)
                notyf.error({ message: "对方已断开（" + msg.message + "）" })
                break;
            case 'msg':
                const result: { type: string; numbers: number[] }[] = []
                if(msg.message.includes("strength")) {
                    const numbers = msg.message.match(/\d+/g).map(Number)
                    result.push({ type: "strength", numbers: numbers })
                }

        }
    }
}

function sendWsMsg(messageObj) {
    messageObj.clientId = connectionId;
    messageObj.targetId = targetWSId;
    if (!messageObj.hasOwnProperty('type'))
        messageObj.type = "msg";
    wsConn.send(JSON.stringify((messageObj)));
}

function addOrIncrease(type, channelIndex, strength) {
    // 1 减少一  2 增加一  3 设置到
    // channel:1-A    2-B
    // 获取当前频道元素和当前值
    let channelStrength = channelIndex === 1 ? channelAStrength : channelBStrength;

    // 如果是设置操作
    if (type === 3) {
        channelStrength = strength; //固定为0
    }
    // 减少一
    else if (type === 1) {
        channelStrength = Math.max(channelStrength - strength, 0);
    }
    // 增加一
    else if (type === 2) {
        channelStrength = Math.min(channelStrength + strength, 200);
    }

    // 构造消息对象并发送
    const data = { type, strength: channelStrength, message: "set channel", channel: channelIndex };
    console.log(data)
    sendWsMsg(data);
}

function clearAB(channelIndex) {
    const data = { type: 4, message: "clear-" + channelIndex }
    sendWsMsg(data);
}

function sendWaveData(timeA, timeB, waveA, waveB) {
    if (fangdouSetTimeOut) {
        return
    }

    /*const msg1 = `A:${waveData[waveA]}`
    const msg2 = `B:${waveData[waveB]}`*/

    const msg1 = `A:${waveA}`
    const msg2 = `B:${waveB}`
    const data = {
        type: "clientMsg", message: msg1, message2: msg2, time1: timeA, time2: timeB
    }

    sendWsMsg(data)

    fangdouSetTimeOut = setTimeout(() => {
        clearTimeout(fangdouSetTimeOut)
        fangdouSetTimeOut = null
    }, fangdou)
}

function closeCoyoteSocket() {
    try {
        wsConn.close()
    }
    catch (e) {
        notyf.error( {message: "郊狼连接断开失败"} )
        console.log(e)
        return
    }
    wsConn = null
    notyf.success( {message: "郊狼连接已断开"} )
}


export { createCoyoteSocket, closeCoyoteSocket, sendWsMsg, sendWaveData, addOrIncrease, clearAB, qrcodeSrc, qrcodeShow, channelAStrength, channelBStrength }
