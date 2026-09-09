import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider>
			{toasts.map(({ id, title, description, action, className, variant, ...props }) => {
				const isDestructive = variant === 'destructive';
				return (
					<Toast key={id} variant={variant} className={className} {...props}>
						<div className="flex items-start gap-3 w-full">
							<div className="mt-0.5 shrink-0">
								{isDestructive ? (
									<div className="w-6 h-6 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-sm animate-pulse">
										<AlertTriangle className="w-3.5 h-3.5" />
									</div>
								) : (
									<div className="w-6 h-6 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm animate-pulse">
										<CheckCircle2 className="w-3.5 h-3.5" />
									</div>
								)}
							</div>
							<div className="grid gap-0.5 flex-1 pr-2">
								{title && <ToastTitle>{title}</ToastTitle>}
								{description && (
									<ToastDescription>{description}</ToastDescription>
								)}
							</div>
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