import { useEffect, useState } from 'react'
import { LAppDelegate } from '../../lib/live2d/src/lappdelegate'
import { Live2dManager } from '../../lib/live2d/live2dManager'
import { useSentioBasicStore } from '../../lib/sentioStore'
import type { AvatarModel } from './types'

interface Live2DCanvasProps {
  currentAvatar: AvatarModel
  isSpeaking: boolean
}

export function Live2DCanvas({ currentAvatar, isSpeaking }: Live2DCanvasProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const lipFactor = useSentioBasicStore(state => state.lipFactor)

  useEffect(() => {
    Live2dManager.getInstance().setLipFactor(lipFactor)
  }, [lipFactor])

  useEffect(() => {
    // 1. 初始化 Live2D 代理（core 体积较大，进入本页时才按需加载）
    const canvas = document.getElementById('live2dCanvas')
    if (!canvas) return

    let disposed = false

    const ensureCoreLoaded = () =>
      new Promise<void>((resolve, reject) => {
        if ((window as any).Live2DCubismCore) {
          resolve()
          return
        }
        const existing = document.querySelector<HTMLScriptElement>('script[data-live2d-core]')
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true })
          existing.addEventListener('error', () => reject(new Error('Live2D core load failed')), { once: true })
          return
        }
        const script = document.createElement('script')
        script.src = '/sentio/core/live2dcubismcore.min.js'
        script.async = true
        script.dataset.live2dCore = '1'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Live2D core load failed'))
        document.head.appendChild(script)
      })

    ensureCoreLoaded()
      .then(() => {
        if (disposed) return
        const success = LAppDelegate.getInstance().initialize()
        if (success) {
          LAppDelegate.getInstance().run()
          setIsLoaded(true)
        }
      })
      .catch((err) => console.error('[Live2D] 初始化失败', err))

    // 2. 监听窗口变化以重绘 Canvas
    const handleResize = () => {
      LAppDelegate.getInstance().onResize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      disposed = true
      window.removeEventListener('resize', handleResize)
      LAppDelegate.releaseInstance()
    }
  }, [])

  // 3. 当选中的分身发生变化时，载入对应模型
  useEffect(() => {
    if (!isLoaded) return

    if (currentAvatar && currentAvatar.type === 'live2d') {
      const resourceModel = {
        resource_id: currentAvatar.id,
        name: currentAvatar.modelName || 'Hiyori',
        type: 'character' as any,
        link: currentAvatar.modelPath || `/sentio/characters/free/${currentAvatar.modelName}/${currentAvatar.modelName}.model3.json`
      }
      Live2dManager.getInstance().changeCharacter(resourceModel)
    }
  }, [currentAvatar, isLoaded])

  // 4. 音频断流时清空口型队列并停止音频，并且当开始/停止说话时，触发模型动作与表情联动
  useEffect(() => {
    if (!isSpeaking) {
      Live2dManager.getInstance().clearAudioQueue()
    } else if (isLoaded) {
      // 触发说话相关的肢体动作与随机表情
      Live2dManager.getInstance().startTalkingMotion();
      Live2dManager.getInstance().setRandomExpression();
      
      // 如果说话持续较长，每隔 4 秒循环播放一次动作以维持动感
      const interval = setInterval(() => {
        Live2dManager.getInstance().startTalkingMotion();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isSpeaking, isLoaded])

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-auto">
      <canvas
        id="live2dCanvas"
        className="w-full h-full bg-transparent"
        style={{ outline: 'none' }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10 text-white font-bold gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin" />
          <span className="text-sm">加载 Live2D 模型中...</span>
        </div>
      )}
    </div>
  )
}
