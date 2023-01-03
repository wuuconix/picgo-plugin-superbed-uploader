import { PicGo, IPluginConfig, IReqOptionsWithBodyResOnly } from 'picgo'
import FormData from "form-data" 
import md5 from "md5"
import { writeFileSync } from 'fs'

interface ISuperbedConfig {
  /* 聚合图床token */
  token: string,
  /* 相册名 */
  categories: string
}

interface SuperBedResponse {
  err: number,
  msg?: string,
  ids?: [string]
}

export = (ctx: PicGo) => {
  const register = (): void => {
    ctx.helper.uploader.register('superbed-uploader', {
      handle,
      config,
      name: "聚合图床"
    })
  }
  return {
    uploader: 'superbed-uploader',
    register
  }
}

async function handle(ctx: PicGo) {
  let { token, categories } = ctx.getConfig<ISuperbedConfig>('picBed.superbed-uploader')
  categories = categories || "PicGo"
  try {
    const imgInfos = ctx.output
    for (const imgInfo of imgInfos) {
      let img = imgInfo.buffer
      const filename = imgInfo.fileName
      if (!img && imgInfo.base64Image) {
        img = Buffer.from(imgInfo.base64Image, "base64")
      }
      const postConfig = postOptions(img, filename, token, categories)
      const body = await ctx.request<SuperBedResponse, IReqOptionsWithBodyResOnly>(postConfig)
      if (body.err === 0) {
        imgInfo.imgUrl = `https://pic.imgdb.cn/item/${body.ids}`
      } else {
        throw JSON.stringify(body)
      }
    }
  } catch(e) {
    ctx.emit("notification", {
      title: "error",
      body: String(e)
    })
  }
}

function postOptions(img: Buffer, filename: string, token: string, categories: string) {
  const formData = new FormData()
  const nonce = Math.round(Math.random() * 1000000000)
  const ts = Math.trunc(+Date.now() / 1000)
  const sign = md5(`${token}_${ts}_${nonce}`) // get this sign formula by wuuconix using reverse enginering
  formData.append("file", img, { filename })
  formData.append("nonce", nonce)
  formData.append("ts", ts)
  formData.append("token", token)
  formData.append("sign", sign)
  formData.append("categories", categories)
  const test = { nonce, ts, token, sign, categories }
  // log(JSON.stringify(test))
  const opt: IReqOptionsWithBodyResOnly = {
    method: "POST",
    url: "https://api.superbed.cn/upload",
    headers: {
      "Content-Type": "multipart/form-data",
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36'
    },
    data: formData
  }
  return opt
}

function config(ctx: PicGo): IPluginConfig[] {
  const userConfig = ctx.getConfig<ISuperbedConfig>('picBed.superbed-uploader') || { token: "", categories: "" }
  const config: IPluginConfig[] = [
    {
      name: "token",
      type: "input",
      default: userConfig.token,
      required: true,
      message: "聚合图床token 可以在cookie中找到",
      alias: "token"
    },
    {
      name: "categories",
      type: "input",
      default: userConfig.categories,
      required: false,
      message: "相册名 默认为 PicGo",
      alias: "categories"
    }     
  ]
  return config
}

function log(text: string) {
  writeFileSync("C:\\Users\\15219\\Desktop\\1.log", text)
}