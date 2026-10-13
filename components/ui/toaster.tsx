'use client';

import { useToast } from '@/hooks/use-toast';
import { Orb } from '@/components/ui/orb';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast variant={variant} key={id} {...props}>
            {/* The same orb as the voice widget's, so a toast reads as the
                assistant speaking: lively for good news, turning faster
                (thinking) for an error. Toasts are capped at one, so this is
                never more than one WebGL scene. */}
            <span className="inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/30">
              <Orb
                colors={['#ff6b78', '#8c1925']}
                seed={3000}
                agentState={variant === 'error' ? 'thinking' : 'talking'}
              />
            </span>
            <div className="grid min-w-0 grow gap-1">
              {title && (
                <ToastTitle className="flex items-center gap-2">
                  {/* The status light, as on the agent tables — the same
                      green and red glow — breathing like the live-events
                      dot, so it reads as a light that is on. */}
                  {(variant === 'success' || variant === 'error') && (
                    <span
                      aria-hidden="true"
                      className={
                        variant === 'success'
                          ? 'inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8),0_0_16px_rgba(74,222,128,0.45)] motion-safe:animate-pulse'
                          : 'inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red-lit shadow-[0_0_8px_rgba(255,46,67,0.8),0_0_16px_rgba(255,46,67,0.45)] motion-safe:animate-pulse'
                      }
                    />
                  )}
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
