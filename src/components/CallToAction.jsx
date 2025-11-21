
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CallToAction({ 
  title = "Prêt à transformer votre toiture ?",
  description = "Rejoignez nos clients satisfaits et lancez votre projet de rénovation énergétique dès aujourd'hui.",
  buttonText = "Commencer maintenant",
  onClick,
  className
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-3xl bg-slate-900 py-16 px-6 sm:py-24 lg:px-8 my-8 shadow-2xl", className)}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10 h-full w-full">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900/0 to-slate-900/0" />
      </div>
      
      <div className="mx-auto max-w-2xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
            {description}
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button 
              size="lg"
              onClick={onClick}
              className="group relative overflow-hidden bg-white text-slate-900 hover:bg-gray-100 hover:text-slate-900 transition-all duration-300 font-bold px-8 py-6 h-auto text-lg"
            >
              <span className="relative z-10 flex items-center">
                {buttonText}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Animated sparkles */}
      <motion.div 
        className="absolute top-12 left-8 sm:left-12 text-yellow-400/20 pointer-events-none"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
          rotate: [0, 15, 0]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      >
        <Sparkles className="h-12 w-12" />
      </motion.div>
      
      <motion.div 
        className="absolute bottom-12 right-8 sm:right-12 text-blue-400/20 pointer-events-none"
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.5, 0.2],
          rotate: [0, -15, 0]
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      >
        <Sparkles className="h-16 w-16" />
      </motion.div>
    </section>
  );
}
