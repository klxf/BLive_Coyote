declare interface ISocketData {
    // ip地址
    ip: number[]

    // host地址 可能是ip 也可能是域名。
    host: string[]

    // 长连使用的请求json体 第三方无需关注内容,建立长连时使用即可。
    auth_body: string

    // tcp 端口号
    tcp_port: number[]

    // ws 端口号
    ws_port: number[]

    // wss 端口号
    wss_port: number[]
}
