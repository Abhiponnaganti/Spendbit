'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button, Card, CardBody } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  PieChart, 
  Wallet,
  ArrowRight,
  Sparkles,
  Brain,
  Target,
  DollarSign,
  CreditCard,
  Activity
} from 'lucide-react';
import Link from 'next/link';

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -10, scale: 1.05 }}
      className="group"
    >
      <Card className="glass-morphism card-hover h-full border-0 bg-white/10 backdrop-blur-xl">
        <CardBody className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-3 shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
          <p className="text-gray-200 leading-relaxed">{description}</p>
        </CardBody>
      </Card>
    </motion.div>
  );
};

const StatCard = ({ number, label, delay = 0 }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="mb-2 text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
        {number}
      </div>
      <div className="text-gray-200 text-sm">{label}</div>
    </motion.div>
  );
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (session) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-50 backdrop-blur-xl bg-white/10 border-b border-white/20">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
            <Wallet className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">Spendbit</span>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Link href="/auth">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/20 border border-white/30"
                >
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 text-center">
        <div className="absolute inset-0 -z-10">
          <div className="floating-animation absolute top-20 left-10 h-32 w-32 rounded-full bg-purple-500/20 blur-xl"></div>
          <div className="floating-animation absolute top-40 right-20 h-24 w-24 rounded-full bg-blue-500/20 blur-xl" style={{ animationDelay: '2s' }}></div>
          <div className="floating-animation absolute bottom-40 left-1/3 h-28 w-28 rounded-full bg-pink-500/20 blur-xl" style={{ animationDelay: '4s' }}></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-6 text-6xl font-bold leading-tight text-white md:text-7xl"
          >
            Master Your{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Financial
            </span>{' '}
            Future
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mb-8 text-xl text-gray-200 md:text-2xl"
          >
            AI-powered insights, smart categorization, and beautiful visualizations
            to transform how you manage money.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              size="lg"
              onPress={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="btn-gradient text-white px-8 py-3 text-lg font-semibold rounded-full flex items-center space-x-2 shadow-2xl hover:shadow-purple-500/25"
            >
              <span>Continue with Google</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
            
            <Link href="/auth">
              <Button
                size="lg"
                variant="bordered"
                className="border-white/30 text-white hover:bg-white/10 px-8 py-3 text-lg font-semibold rounded-full"
              >
                Sign up with Email
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mx-auto mt-20 max-w-4xl"
        >
          <div className="glass-morphism rounded-2xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatCard number="50K+" label="Happy Users" delay={0.1} />
              <StatCard number="$2M+" label="Money Tracked" delay={0.2} />
              <StatCard number="99.9%" label="Uptime" delay={0.3} />
              <StatCard number="24/7" label="Support" delay={0.4} />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-5xl font-bold text-white">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-200">
              Everything you need to take control of your finances
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="AI-Powered Insights"
              description="Get personalized financial advice and budget optimization suggestions powered by advanced AI algorithms."
              delay={0.1}
            />
            <FeatureCard
              icon={PieChart}
              title="Smart Categorization"
              description="Automatically categorize transactions from PDF, CSV, or TXT bank statements with 99% accuracy."
              delay={0.2}
            />
            <FeatureCard
              icon={BarChart3}
              title="Interactive Charts"
              description="Visualize your spending patterns and financial trends with beautiful, interactive dashboards."
              delay={0.3}
            />
            <FeatureCard
              icon={Shield}
              title="Bank-Level Security"
              description="Your financial data is protected with enterprise-grade encryption and security protocols."
              delay={0.4}
            />
            <FeatureCard
              icon={Zap}
              title="Real-time Updates"
              description="Get instant notifications and real-time updates on your financial activities and goals."
              delay={0.5}
            />
            <FeatureCard
              icon={Target}
              title="Goal Tracking"
              description="Set and track financial goals with smart recommendations to help you achieve them faster."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="glass-morphism rounded-3xl p-12">
            <Sparkles className="mx-auto mb-6 h-16 w-16 text-yellow-400" />
            <h2 className="mb-6 text-4xl font-bold text-white">
              Ready to Transform Your Finances?
            </h2>
            <p className="mb-8 text-xl text-gray-200">
              Join thousands of users who have already taken control of their financial future.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onPress={() => signIn('google', { callbackUrl: '/dashboard' })}
                className="btn-gradient text-white px-8 py-4 text-lg font-semibold rounded-full shadow-2xl hover:shadow-purple-500/25"
              >
                Get Started Free
              </Button>
              <Link href="/auth">
                <Button
                  size="lg"
                  variant="bordered"
                  className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold rounded-full"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
