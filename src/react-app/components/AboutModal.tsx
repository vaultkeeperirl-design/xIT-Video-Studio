import { X, ExternalLink, Github, Heart } from 'lucide-react';
import xitLogo from '@/assets/xit_logo.png';
import packageJson from '../../../package.json';

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="relative p-6 flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-24 h-24 mb-6 bg-zinc-800 rounded-2xl flex items-center justify-center shadow-inner">
            <img src={xitLogo} alt="xIT Logo" className="w-16 h-16 object-contain" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {packageJson.productName || 'xIT Video Studio'}
          </h2>

          <div className="flex items-center gap-2 mb-6">
            <span className="px-2 py-0.5 text-xs font-mono font-medium text-brand-400 bg-brand-400/10 rounded-full border border-brand-400/20">
              v{packageJson.version}
            </span>
            <span className="text-zinc-500 text-sm">
              Build {new Date().toISOString().split('T')[0]}
            </span>
          </div>

          <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-sm">
            The next-generation AI video editor designed for creators.
            Powered by Remotion, FFmpeg, and cutting-edge AI models.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full mb-8">
            <a
              href="https://github.com/vaultkeeperirl-design/xIT-Video-Studio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors text-sm font-medium border border-zinc-700 hover:border-zinc-600"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href="https://xit.video"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors text-sm font-medium border border-zinc-700 hover:border-zinc-600"
            >
              <ExternalLink className="w-4 h-4" />
              Website
            </a>
          </div>

          <div className="text-xs text-zinc-600 flex items-center gap-1.5">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500/20" /> by the xIT Team
          </div>
        </div>

        <div className="bg-zinc-950/50 p-4 border-t border-zinc-800/50 text-center">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
            © {new Date().getFullYear()} xIT Video Studio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
