import { useState } from 'react';
import { isInAppBrowser } from '@/types';
import { AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function InAppBrowserOverlay() {
  const [showOverlay, setShowOverlay] = useState(isInAppBrowser);

  if (!showOverlay) return null;

  const ua = navigator.userAgent;
  const browserName = /Zalo/i.test(ua)
    ? 'Zalo'
    : /FBAN|FBAV|FB_IAB/i.test(ua)
      ? 'Facebook'
      : /Messenger/i.test(ua)
        ? 'Messenger'
        : /Instagram/i.test(ua)
          ? 'Instagram'
          : /MicroMessenger/i.test(ua)
            ? 'WeChat'
            : /Line\//i.test(ua)
              ? 'LINE'
              : 'trình duyệt trong ứng dụng';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Đã sao chép link');
    } catch {
      toast.error('Không sao chép tự động được. Hãy dùng menu Chia sẻ của ứng dụng.');
    }
  };

  return (
    <div className="season-gradient fixed inset-0 z-[100] overflow-y-auto px-5 py-8 text-white">
      <div className="mx-auto flex min-h-full w-full max-w-md items-center">
        <div className="w-full rounded-[2rem] bg-slate-950/20 p-6 text-center backdrop-blur-xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/12">
            <AlertTriangle className="h-8 w-8 text-amber-200" />
          </div>

          <h1 className="mt-5 text-2xl font-black">Nên mở bằng Safari, Chrome hoặc Edge</h1>
          <p className="mt-3 text-sm leading-6 text-white/75">
            Bạn đang mở từ <strong className="text-white">{browserName}</strong>. Trình duyệt nhúng có thể hạn chế clipboard, Wake Lock hoặc phiên đăng nhập Firebase.
          </p>

          <div className="mt-5 rounded-2xl bg-white/10 p-4 text-left text-sm leading-6 text-white/85">
            <p className="font-bold text-white">Cách ổn định nhất</p>
            <p className="mt-1">Mở menu ••• của ứng dụng → chọn “Mở trong trình duyệt”, hoặc sao chép link rồi dán vào trình duyệt mặc định.</p>
          </div>

          <div className="mt-5 grid gap-2">
            <Button
              onClick={() => void copyLink()}
              className="h-12 rounded-xl bg-white font-bold text-slate-900 hover:bg-white/90"
            >
              <Copy className="mr-2 h-4 w-4" />
              Sao chép link
            </Button>
            <Button
              onClick={() => setShowOverlay(false)}
              variant="ghost"
              className="h-12 rounded-xl text-white hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Vẫn tiếp tục ở đây
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
