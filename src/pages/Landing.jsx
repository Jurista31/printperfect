import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { Printer, Camera, Zap, Target, Users, ArrowRight, CheckCircle2, Smartphone } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Landing() {
  const features = [
    {
      icon: Camera,
      title: "Instant Analysis",
      description: "Snap a photo and get AI-powered defect detection in seconds"
    },
    {
      icon: Target,
      title: "20+ Defects Detected",
      description: "Identifies layer issues, warping, stringing, and more"
    },
    {
      icon: Zap,
      title: "Smart Solutions",
      description: "Get step-by-step fixes and printer settings recommendations"
    },
    {
      icon: Users,
      title: "Community Sharing",
      description: "Learn from others and share your success stories"
    }
  ];

  const handleInstallClick = () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      // Already installed, just navigate
      window.location.href = createPageUrl('Home');
    } else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      // iOS - show instructions
      alert('To install: Tap the Share button (⬆️) and select "Add to Home Screen"');
    } else if (/Android/.test(navigator.userAgent)) {
      // Android - try to trigger install prompt or show instructions
      alert('To install: Tap the menu (⋮) and select "Add to Home screen" or "Install app"');
    } else {
      // Desktop or other - just navigate
      window.location.href = createPageUrl('Home');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 pb-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 mb-6 shadow-2xl shadow-cyan-500/20"
          >
            <Printer className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold text-white mb-4"
          >
            PrintDoc
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto"
          >
            Your AI-Powered 3D Print Defect Analyzer
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-400 mb-10 max-w-xl mx-auto"
          >
            Instantly identify print defects, understand what went wrong, and get expert solutions to fix your prints.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link to={createPageUrl('Home')}>
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-xl shadow-cyan-500/20 transition-all duration-300 hover:scale-105"
              >
                Launch App <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>

            <Button
              size="lg"
              variant="outline"
              onClick={handleInstallClick}
              className="h-14 px-8 text-lg border-2 border-slate-700 hover:border-cyan-500 text-white font-semibold rounded-xl transition-all duration-300 hover:bg-slate-800"
            >
              <Smartphone className="mr-2 w-5 h-5" />
              Install App
            </Button>
          </motion.div>

          {/* Install hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-slate-500 mt-4"
          >
            💡 Works offline • No download needed • Install to home screen
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="bg-slate-800/30 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-slate-700/50 mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4 border-2 border-cyan-500">
                <span className="text-2xl font-bold text-cyan-400">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Capture</h3>
              <p className="text-slate-400">
                Take a photo or upload an image of your 3D print. Multi-angle support for better accuracy.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4 border-2 border-teal-500">
                <span className="text-2xl font-bold text-teal-400">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Analyze</h3>
              <p className="text-slate-400">
                Our AI analyzes your print, detecting defects and pinpointing exact locations on the image.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4 border-2 border-purple-500">
                <span className="text-2xl font-bold text-purple-400">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Fix</h3>
              <p className="text-slate-400">
                Get detailed solutions, printer setting recommendations, and share results with the community.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Why PrintDoc?
          </h2>

          <div className="space-y-4">
            {[
              "Identifies 20+ common 3D printing defects instantly",
              "Provides step-by-step solutions tailored to your issue",
              "Visual defect mapping shows exactly where problems are",
              "Printer settings recommendations with priority levels",
              "Community features to share and learn from others",
              "Works offline once installed - no internet required",
              "Multi-angle analysis for higher accuracy",
              "Complete analysis history to track improvements"
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3 + index * 0.05 }}
                className="flex items-start gap-3 bg-slate-800/30 rounded-xl p-4 border border-slate-700/30"
              >
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="text-center mt-16"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            Ready to Perfect Your Prints?
          </h2>
          <Link to={createPageUrl('Home')}>
            <Button
              size="lg"
              className="h-14 px-10 text-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-xl shadow-cyan-500/20 transition-all duration-300 hover:scale-105"
            >
              Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}