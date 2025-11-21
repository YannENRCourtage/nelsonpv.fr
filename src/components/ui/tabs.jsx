import { cn } from '@/lib/utils';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import React from 'react';

const Tabs = React.forwardRef(({ className, orientation, ...props }, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn('flex', orientation === 'vertical' ? 'flex-row' : 'flex-col', className)}
    {...props}
  />
));
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
      'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:h-auto data-[orientation=vertical]:bg-transparent data-[orientation=vertical]:p-0 data-[orientation=vertical]:border-r',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      'data-[orientation=vertical]:justify-start data-[orientation=vertical]:rounded-none data-[orientation=vertical]:px-4 data-[orientation=vertical]:py-2 data-[orientation=vertical]:data-[state=active]:bg-muted data-[orientation=vertical]:data-[state=active]:shadow-none data-[orientation=vertical]:border-r-2 data-[orientation=vertical]:border-transparent data-[orientation=vertical]:data-[state=active]:border-primary',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'data-[orientation=vertical]:mt-0 data-[orientation=vertical]:flex-grow',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };