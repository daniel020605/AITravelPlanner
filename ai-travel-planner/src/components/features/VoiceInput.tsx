import { useState, useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  className?: string;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        maxAlternatives: number;
        onstart: () => void;
        onresult: (event: SpeechRecognitionEvent) => void;
        onerror: (event: { error: string }) => void;
        onend: () => void;
        start: () => void;
        abort: () => void;
      };
    };
    webkitSpeechRecognition?: Window['SpeechRecognition'];
  }
}

const VoiceInput = ({
  onTranscript,
  onError,
  placeholder = '点击开始语音输入',
  className = '',
}: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // 检查浏览器是否支持语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = () => {
    if (!isSupported) {
      onError?.('您的浏览器不支持语音识别功能');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError?.('您的浏览器不支持语音识别功能');
      return;
    }
    
    const recognition = new SpeechRecognition();

    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      setTranscript(transcript);

      // 如果识别置信度足够高，则传递结果
      if (confidence > 0.7) {
        onTranscript(transcript);
      } else {
        onError?.('语音识别置信度较低，请重试');
      }
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      let errorMessage = '语音识别失败';
      switch (event.error) {
        case 'no-speech':
          errorMessage = '未检测到语音输入';
          break;
        case 'audio-capture':
          errorMessage = '无法访问麦克风';
          break;
        case 'not-allowed':
          errorMessage = '麦克风权限被拒绝';
          break;
        case 'network':
          errorMessage = '网络错误';
          break;
        default:
          errorMessage = `语音识别错误: ${event.error}`;
      }

      onError?.(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      onError?.('启动语音识别失败');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (isListening) {
      // 强制停止识别
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.abort();
        } catch (error) {
          console.error('Failed to abort speech recognition:', error);
        }
      }
      setIsListening(false);
    }
  };

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
        <MicrophoneIcon className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-500">浏览器不支持语音识别</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-3">
        <button
          onClick={handleClick}
          disabled={isListening}
          className={`flex items-center justify-center p-3 rounded-full transition-all ${
            isListening
              ? 'bg-red-100 hover:bg-red-200 text-red-600 animate-pulse'
              : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
          }`}
          title={isListening ? '停止录音' : placeholder}
        >
          {isListening ? (
            <StopIcon className="h-6 w-6" />
          ) : (
            <MicrophoneIcon className="h-6 w-6" />
          )}
        </button>

        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {isListening ? '正在听取语音输入...' : placeholder}
          </p>
          {isListening && (
            <div className="flex items-center space-x-1 mt-2">
              <div className="flex space-x-1">
                <div className="w-1 h-4 bg-red-500 animate-pulse"></div>
                <div className="w-1 h-6 bg-red-500 animate-pulse animation-delay-100"></div>
                <div className="w-1 h-4 bg-red-500 animate-pulse animation-delay-200"></div>
                <div className="w-1 h-8 bg-red-500 animate-pulse animation-delay-300"></div>
                <div className="w-1 h-4 bg-red-500 animate-pulse animation-delay-400"></div>
              </div>
              <span className="text-xs text-gray-500 ml-2">录音中</span>
            </div>
          )}
        </div>
      </div>

      {transcript && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 font-medium mb-1">识别结果：</p>
          <p className="text-gray-900">{transcript}</p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animation-delay-100 {
          animation-delay: 100ms;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }

        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </div>
  );
};

export default VoiceInput;