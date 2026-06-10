import React, { useState, useEffect } from 'react';
import {
    LineChart,
    Wallet,
    PieChart,
    TrendingUp,
    Shield,
    Zap,
    CheckCircle,
    ArrowRight,
    Menu,
    X
} from 'lucide-react';

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    const handleLogin = () => {
        window.location.href = '/login';
    };

    const handleSignup = () => {
        window.location.href = '/signup'; // App.js will need to handle this
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-300">
            {/* HEADER */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                            E
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                            Easy Trade Log
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection('features')} className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors text-sm uppercase tracking-wider">Features</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors text-sm uppercase tracking-wider">Pricing</button>
                        <button onClick={() => scrollToSection('faq')} className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors text-sm uppercase tracking-wider">FAQ</button>
                    </nav>

                    <div className="hidden md:flex items-center gap-4">
                        <button onClick={handleLogin} className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
                            Log in
                        </button>
                        <button onClick={handleSignup} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-medium transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0">
                            Get Started
                        </button>
                    </div>

                    <button className="md:hidden text-slate-700 dark:text-slate-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-4 shadow-lg animate-in slide-in-from-top-2">
                        <button onClick={() => scrollToSection('features')} className="text-left font-medium text-slate-600 dark:text-slate-400 py-2">Features</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-left font-medium text-slate-600 dark:text-slate-400 py-2">Pricing</button>
                        <button onClick={() => scrollToSection('faq')} className="text-left font-medium text-slate-600 dark:text-slate-400 py-2">FAQ</button>
                        <hr className="border-slate-100 dark:border-slate-800" />
                        <button onClick={handleLogin} className="text-center font-medium text-slate-600 dark:text-slate-400 py-2">Log in</button>
                        <button onClick={handleSignup} className="bg-indigo-600 text-white py-3 rounded-lg font-medium">Get Started</button>
                    </div>
                )}
            </header>

            {/* HERO SECTION */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden transition-colors duration-300">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-50 translate-x-1/3 -translate-y-1/4"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-100/50 dark:bg-violet-900/10 rounded-full blur-3xl opacity-50 -translate-x-1/3 translate-y-1/4"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 text-sm font-medium mb-8 animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        New: Pro Analytics & Insights
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                        Master Your Mind, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                            Master the Markets
                        </span>
                    </h1>

                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        The professional trading journal that helps you track performance, analyze emotions, and build a profitable edge—without the spreadsheet headaches.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                        <button onClick={handleSignup} className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold text-lg transition-all hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 group">
                            Start Free Trial
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button onClick={() => scrollToSection('features')} className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-full font-semibold text-lg transition-all hover:border-slate-300 flex items-center justify-center gap-2">
                            Learn More
                        </button>
                    </div>

                    {/* Feature Preview / Dashboard Mockup */}
                    <div className="relative mx-auto max-w-5xl rounded-2xl bg-slate-900 dark:bg-black p-2 shadow-2xl ring-1 ring-slate-900/10 dark:ring-black/50">
                        <div className="bg-slate-800 dark:bg-slate-950 rounded-xl overflow-hidden aspect-[16/9] flex items-center justify-center relative">
                            <img
                                src="https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&q=80&w=2000"
                                alt="App Dashboard"
                                className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 dark:from-black/60 to-transparent"></div>

                            <div className="absolute bottom-8 left-8 right-8 text-left">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg font-mono text-sm">
                                        +2.4R Today
                                    </div>
                                    <div className="bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 text-indigo-300 px-4 py-2 rounded-lg font-mono text-sm">
                                        Win Rate: 68%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES SECTION */}
            <section id="features" className="py-24 bg-white dark:bg-slate-900 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">Everything you need to trade better.</h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400">Stop guessing. Start knowing. Our comprehensive toolkit gives you the clarity professional traders rely on.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<LineChart className="w-6 h-6 text-indigo-600" />}
                            title="Advanced Analytics"
                            desc="Visualize your performance with equity curves, win rates, and profit factors automatically calculated."
                        />
                        <FeatureCard
                            icon={<PieChart className="w-6 h-6 text-violet-600" />}
                            title="Emotion Tracking"
                            desc="Log how you feel with every trade. Identify patterns where emotions are costing you money."
                        />
                        <FeatureCard
                            icon={<Shield className="w-6 h-6 text-emerald-600" />}
                            title="Risk Management"
                            desc="Track R-multiples and risk per trade. Ensure you're not over-leveraging on bad setups."
                        />
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-amber-500" />}
                            title="Fast Logging"
                            desc="Log trades in seconds with our optimized interface. Import from CSV or connect APIs directly."
                        />
                        <FeatureCard
                            icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
                            title="Strategy Tagging"
                            desc="Tag trades by strategy (e.g., 'Breakout', 'Reversal'). See exactly which setups pay off."
                        />
                        <FeatureCard
                            icon={<Wallet className="w-6 h-6 text-rose-500" />}
                            title="Bankroll Management"
                            desc="Manage multiple accounts. Track growth across different brokers or challenges effortlessly."
                        />
                    </div>
                </div>
            </section>

            {/* PRICING SECTION */}
            <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-semibold mb-6">
                            Pricing
                        </div>
                        <h2 className="text-4xl lg:text-6xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                            Simple, transparent pricing
                        </h2>
                        <p className="text-xl text-slate-600 dark:text-slate-400">
                            Start free, upgrade when you're ready. No hidden fees.
                        </p>

                        {/* Toggle */}
                        <div className="mt-10 inline-flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-2 py-2 shadow-sm">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${billingCycle === 'monthly'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${billingCycle === 'yearly'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                Yearly
                            </button>
                            <span className="ml-1 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                                Save 20%
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
                        {/* Free Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-10 border border-slate-200 dark:border-slate-800 transition-all hover:shadow-xl group">
                            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Free</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-6xl font-black text-slate-900 dark:text-white">$0</span>
                                <span className="text-slate-500 dark:text-slate-400 font-medium">for 14 days</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 mb-10 font-medium">Basic tracking to get started</p>

                            <div className="space-y-6 mb-10">
                                <CheckItem text="Full access for 14 days" />
                                <CheckItem text="Unlimited trades" />
                                <CheckItem text="Basic analytics" />
                                <CheckItem text="Screenshot attachments" />
                                <CheckItem text="Email support" />
                            </div>

                            <button onClick={handleSignup} className="w-full py-4 px-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                Get Started
                            </button>
                        </div>

                        {/* Pro Card */}
                        <div className="relative bg-indigo-50 dark:bg-indigo-900/10 rounded-[32px] p-10 border-2 border-indigo-600 dark:border-indigo-500 shadow-2xl transition-all group overflow-hidden">
                            <div className="absolute top-0 right-10 bg-indigo-600 text-white text-[10px] font-black px-4 py-2 rounded-b-xl tracking-widest uppercase">
                                Most Popular
                            </div>

                            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Pro</h3>
                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-6xl font-black text-slate-900 dark:text-white">
                                    ${billingCycle === 'monthly' ? '7.90' : '6.30'}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 font-medium">/month</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 mb-10 font-medium">Everything you need to improve</p>

                            <div className="space-y-6 mb-10">
                                <CheckItem text="Unlimited trades" />
                                <CheckItem text="Advanced analytics & reports" />
                                <CheckItem text="Session & instrument breakdown" />
                                <CheckItem text="R-multiple tracking" />
                                <CheckItem text="Priority support" />
                            </div>

                            <button onClick={handleSignup} className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-1">
                                Upgrade to Pro
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CALL TO ACTION */}
            <section className="py-24 bg-indigo-900 dark:bg-indigo-950 overflow-hidden relative transition-colors duration-300">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl opacity-50 translate-x-1/3 -translate-y-1/4"></div>
                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to take your trading seriously?</h2>
                    <p className="text-indigo-200 text-lg mb-10 max-w-2xl mx-auto">
                        Join thousands of traders who are building discipline and profitability with Easy Trade Log.
                    </p>
                    <button onClick={handleSignup} className="px-10 py-4 bg-white text-indigo-900 rounded-full font-bold text-lg hover:bg-indigo-50 transition-colors shadow-xl">
                        Get Started for Free
                    </button>
                    <p className="mt-6 text-indigo-300 text-sm">14-day free trial • No credit card required</p>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-slate-900 dark:bg-black text-slate-400 dark:text-slate-500 py-12 border-t border-slate-800 dark:border-slate-900 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">E</div>
                        <span className="text-white font-bold text-lg">EasyTrade Log</span>
                    </div>

                    <div className="flex gap-6 text-sm">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                    </div>

                    <div className="text-sm">
                        &copy; {new Date().getFullYear()} Easy Trade Log. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-lg dark:hover:shadow-indigo-500/10 transition-all hover:bg-white dark:hover:bg-slate-800 group">
            <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
        </div>
    );
}

function CheckItem({ text }) {
    return (
        <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">{text}</span>
        </div>
    );
}
