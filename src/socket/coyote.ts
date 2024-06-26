import {ref} from "vue";
import { Notyf } from 'notyf'
import QRCode from 'qrcode'

const notyf = new Notyf({ duration: 4000 })

let channelAStrength = ref(0);     // A通道强度
let channelBStrength = ref(0);     // B通道强度
let softAStrength = ref(0);        // A通道软上限
let softBStrength = ref(0);        // B通道软上限
let followAStrength = ref(false);  //跟随A通道软上限
let followBStrength = ref(false);  //跟随B通道软上限

const coyoteState = ref(false)

let connectionId = ""; // 从接口获取的连接标识符
let targetWSId = ""; // 发送目标
let fangdou = 500; //500毫秒防抖
let fangdouSetTimeOut; // 防抖定时器
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
        console.log("WebSocket连接已建立")
    }

    wsConn.onmessage = function (event) {
        let msg = {} as any
        try {
            msg = JSON.parse(event.data);
        } catch (e) {
            console.log(event.data);
            return
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
                        return
                    }
                    targetWSId = msg.targetId;
                    console.log("收到targetId: " + msg.targetId + ", msg: " + msg.message);
                    qrcodeShow.value = false
                    notyf.success({message: "郊狼连接成功"})
                    coyoteState.value = true
                }
                break
            case 'break':
                if (msg.targetId != targetWSId)
                    return
                console.log("收到断开连接指令")
                notyf.error({ message: "收到断开连接指令" })
                coyoteState.value = false
                //location.reload();
                break
            case 'error':
                if (msg.targetId != targetWSId)
                    return
                console.log("对方已断开，code：" + msg.message)
                notyf.error({ message: "对方已断开（" + msg.message + "）" })
                coyoteState.value = false
                break
            case 'msg':
                const result: { type: string; numbers: number[] }[] = []
                if(msg.message.includes("strength")) {
                    const numbers = msg.message.match(/\d+/g).map(Number)
                    result.push({ type: "strength", numbers: numbers })

                    console.log(numbers)
                    channelAStrength.value = numbers[0];
                    channelBStrength.value = numbers[1];

                    softAStrength.value = numbers[2];
                    softBStrength.value = numbers[3];

                    if (followAStrength.value && numbers[2] !== numbers[0]) {
                        const data1 = { type: 4, message: `strength-1+2+${numbers[2]}` }
                        sendWsMsg(data1)
                    }

                    if (followBStrength.value && numbers[3] !== numbers[1]) {
                        const data2 = { type: 4, message: `strength-2+2+${numbers[3]}` }
                        sendWsMsg(data2)
                    }
                } else if (msg.message.includes("feedback")) {
                    notyf.success({ message: feedBackMsg[msg.message] })
                }
                break
            case 'heartbeat':
                console.log("收到心跳包")
                break
            default:
                console.log("未知消息类型：" + JSON.stringify(msg));
                break
        }
    }

    wsConn.onerror = function (event) {
        console.log("WebSocket连接出错")
        notyf.error({ message: "WebSocket连接出错" })
        coyoteState.value = false
    }

    wsConn.onclose = function (event) {
        console.log("WebSocket连接已关闭")
        notyf.error({ message: "WebSocket连接已关闭" })
        coyoteState.value = false
    }
}

function sendWsMsg(messageObj) {
    messageObj.clientId = connectionId;
    messageObj.targetId = targetWSId;
    if (!messageObj.hasOwnProperty('type'))
        messageObj.type = "msg";
    wsConn.send(JSON.stringify((messageObj)))
}

function addOrIncrease(type, channelIndex, strength) {
    // 1 减少  2 增加  3 设置到
    // channel:1-A    2-B
    // 获取当前通道的当前值
    let channelStrength = channelIndex === 1 ? channelAStrength.value : channelBStrength.value;

    // 如果是设置操作
    if (type === 3) {
        channelStrength = strength
    }
    // 减少
    else if (type === 1) {
        channelStrength = Math.max(channelStrength - strength, 0)
    }
    // 增加
    else if (type === 2) {
        channelStrength = Math.min(channelStrength + strength, 200)
    }

    // 构造消息对象并发送
    let data = {}
    if (type === 3) {
        data = { type, strength: channelStrength, message: "set channel", channel: channelIndex }
    } else {
        // 这里用 type 4 可以自定义增加减小是数值，type 2/3 固定是 1
        data = { type: 4, message: "strength-" + channelIndex + "+" + (type - 1) + "+" + strength }
    }

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
    coyoteState.value = false
}


export {
    createCoyoteSocket,
    closeCoyoteSocket,
    sendWsMsg,
    sendWaveData,
    addOrIncrease,
    clearAB,
    coyoteState,
    qrcodeSrc,
    qrcodeShow,
    channelAStrength,
    channelBStrength,
    softAStrength,
    softBStrength,
    followAStrength,
    followBStrength
}
