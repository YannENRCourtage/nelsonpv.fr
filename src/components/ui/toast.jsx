import { cn } from '@/lib/utils';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import React from 'react';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Viewport
		ref={ref}
		className={cn(
			'fixed top-3 right-3 sm:top-5 sm:right-5 z-[99999] flex max-h-screen w-full max-w-[460px] flex-col p-2 pointer-events-none gap-2.5',
			className,
		)}
		{...props}
	/>
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
	'pointer-events-auto group relative flex w-full items-start justify-between space-x-3 overflow-hidden rounded-2xl p-4 pr-10 shadow-2xl transition-all duration-300 backdrop-blur-md data-[swipe=move]:transition-none data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[state=open]:animate-in data-[state=open]:slide-in-from-top-6 data-[state=open]:fade-in-50 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full hover:scale-[1.01]',
	{
		variants: {
			variant: {
				default:
					'bg-gradient-to-br from-[#0c1f38]/95 via-[#112d54]/95 to-[#09182b]/95 text-white border-2 border-blue-400/60 shadow-[0_15px_40px_-5px_rgba(12,31,56,0.65),0_0_25px_rgba(59,130,246,0.3)] ring-1 ring-white/10',
				destructive:
					'bg-gradient-to-br from-[#2b0c10]/95 via-[#3f1218]/95 to-[#1f060a]/95 text-red-100 border-2 border-red-500/80 shadow-[0_15px_40px_-5px_rgba(220,38,38,0.55),0_0_25px_rgba(239,68,68,0.35)] ring-1 ring-red-400/20',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
	return (
		<ToastPrimitives.Root
			ref={ref}
			className={cn(toastVariants({ variant }), className)}
			{...props}
		/>
	);
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Action
		ref={ref}
		className={cn(
			'inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:pointer-events-none disabled:opacity-50',
			className,
		)}
		{...props}
	/>
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Close
		ref={ref}
		className={cn(
			'absolute right-3 top-3 rounded-xl p-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-all focus:outline-none cursor-pointer',
			className,
		)}
		toast-close=""
		{...props}
	>
		<X className="h-4 w-4" />
	</ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Title
		ref={ref}
		className={cn('text-[13.5px] font-black text-white tracking-tight leading-snug flex items-center gap-1.5', className)}
		{...props}
	/>
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Description
		ref={ref}
		className={cn('text-xs font-medium text-blue-100/90 leading-relaxed mt-0.5', className)}
		{...props}
	/>
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
	Toast,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
};