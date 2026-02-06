import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion } from 'framer-motion';
import { Printer, Camera, Zap, Target, Users, ArrowRight, CheckCircle2, Smartphone, Wand2, Lightbulb, Brain, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  const features = [
    {
      icon: Camera,
      title: "AI Vision Analysis",
      description: "Advanced computer vision detects 30+ defects with pinpoint accuracy",
      gradient: "from-cyan-500 to-blue-500"
    },
    {
      icon: Wand2,
      title: "Smart Wizard",
      description: "Interactive troubleshooting guides you to the perfect solution",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Lightbulb,
      title: "Personalized Tips",
      description: "AI learns from your prints to provide custom improvement advice",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      icon: Users,
      title: "Global Community",
      description: "Share successes, learn from 1000s of prints worldwide",
      gradient: "from-emerald-500 to-teal-500"
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
          className="text-center mb-20"
        >
          {/* Logo with animated glow */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative inline-flex items-center justify-center mb-6"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-teal-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500 via-purple-500 to-teal-500 flex items-center justify-center shadow-2xl">
              <Printer className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/30 px-4 py-1 mb-4">
              <Brain className="w-3 h-3 mr-1.5" />
              Powered by Advanced AI
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">
              PrintDoc
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-3xl text-white font-semibold mb-4 max-w-3xl mx-auto"
          >
            Turn Failed Prints into Perfect Results
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Advanced AI instantly analyzes your 3D prints, detects defects with surgical precision, and provides expert-level solutions — all in seconds.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6"
          >
            <Link to={createPageUrl('Home')}>
              <Button
                size="lg"
                className="h-16 px-10 text-lg bg-gradient-to-r from-cyan-600 via-purple-600 to-teal-600 hover:from-cyan-500 hover:via-purple-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-2xl shadow-cyan-500/30 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/50"
              >
                Start Analyzing Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>

            <Button
              size="lg"
              variant="outline"
              onClick={handleInstallClick}
              className="h-16 px-8 text-lg border-2 border-slate-700 hover:border-purple-500 text-white font-semibold rounded-2xl transition-all duration-300 hover:bg-slate-800 hover:scale-105"
            >
              <Smartphone className="mr-2 w-5 h-5" />
              Install App
            </Button>
          </motion.div>

          {/* Social proof & features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center items-center gap-6 text-sm text-slate-400"
          >
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>AI-Powered Analysis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Free</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Instant Results</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span>Works Offline</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid md:grid-cols-2 gap-6 mb-20"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="group relative bg-slate-800/40 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 hover:border-slate-600 transition-all duration-500 hover:scale-[1.02]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl`} />
                
                <div className="relative">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} bg-opacity-10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="relative bg-gradient-to-br from-slate-800/50 to-slate-800/30 backdrop-blur-sm rounded-3xl p-8 md:p-16 border border-slate-700/50 mb-20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-teal-500/5 pointer-events-none" />
          
          <div className="relative">
            <div className="text-center mb-14">
              <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30 px-4 py-1 mb-4">
                Simple & Powerful
              </Badge>
              <h2 className="text-4xl font-bold text-white mb-4">
                How It Works
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                From photo to solution in under 10 seconds
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              <div className="relative text-center group">
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-xl">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Capture</h3>
                <p className="text-slate-400 leading-relaxed">
                  Snap a quick photo or upload images from any angle. Multi-angle mode boosts accuracy.
                </p>
              </div>

              <div className="relative text-center group">
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-xl">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">AI Analysis</h3>
                <p className="text-slate-400 leading-relaxed">
                  Advanced computer vision scans every detail, mapping defects with pixel-perfect precision.
                </p>
              </div>

              <div className="relative text-center group">
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-xl">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Get Solutions</h3>
                <p className="text-slate-400 leading-relaxed">
                  Receive expert-level fixes, exact settings, and prevention tips — instantly.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to Master 3D Printing
            </h2>
            <p className="text-slate-400 text-lg">
              Professional-grade tools, completely free
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Target, text: "Detects 30+ defect types with AI precision" },
              { icon: Brain, text: "Learns from your prints for personalized tips" },
              { icon: Wand2, text: "Interactive troubleshooting wizard" },
              { icon: Camera, text: "Visual defect mapping with bounding boxes" },
              { icon: Zap, text: "Instant analysis in 5-10 seconds" },
              { icon: CheckCircle2, text: "Step-by-step solutions with priority levels" },
              { icon: Users, text: "Share & learn from global community" },
              { icon: Smartphone, text: "Works offline after first install" }
            ].map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.7 + index * 0.05 }}
                  className="flex items-center gap-4 bg-slate-800/40 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <span className="text-slate-300 font-medium">{benefit.text}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="relative bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-teal-500/10 rounded-3xl p-12 md:p-16 border border-cyan-500/20 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzA4OGFhNiIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
          
          <div className="relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 2.1, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 mb-6 mx-auto"
            >
              <Star className="w-8 h-8 text-white fill-white" />
            </motion.div>

            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Ready to Perfect Your Prints?
            </h2>
            <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of makers using AI to solve print problems faster than ever.
            </p>
            
            <Link to={createPageUrl('Home')}>
              <Button
                size="lg"
                className="h-16 px-12 text-lg bg-gradient-to-r from-cyan-600 via-purple-600 to-teal-600 hover:from-cyan-500 hover:via-purple-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-2xl shadow-cyan-500/30 transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/50"
              >
                Start Analyzing Now — It's Free
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </Link>

            <p className="text-sm text-slate-500 mt-6">
              No sign-up required • Instant access • Works on any device
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}