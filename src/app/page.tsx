import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  Scale,
  History,
  Navigation,
  MapPin,
  Tablet,
  Plus,
  ArrowRight,
  ShoppingCart,
  Package,
  Boxes,
  ClipboardList,
  CheckCircle2,
  Zap,
  Truck,
  Shield,
  Layers,
} from 'lucide-react';
import LandingPricing from '@/components/LandingPricing';
import LogisticsWorkflowInfographic from '@/components/LogisticsWorkflowInfographic';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch website settings and subscription plans
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { deviceLimit: 'asc' },
  });

  const cms = (await prisma.websiteSettings.findFirst()) || {
    heroHeadline: 'Calculate. Track. Manage. Ship Smarter.',
    heroSubtitle:
      'GEO TRANSIT is an enterprise logistics platform offering high-speed volumetric calculators and commercial cargo packaging solutions.',
    supportEmail: 'support@geotransit.com',
    footerText: '© 2026 GEO TRANSIT. All rights reserved.',
  };

  const adminExists = (await prisma.user.count({ where: { role: 'ADMIN' } })) > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Pending Setup Alert */}
      {!adminExists && (
        <div className="bg-amber-600 text-white text-center py-2 px-4 font-medium text-sm flex items-center justify-center gap-2">
          <span>⚠️ System setup is pending. First administrator must bootstrap the application.</span>
          <Link href="/setup" className="underline font-bold hover:text-amber-100">
            Go to Setup Page &rarr;
          </Link>
        </div>
      )}

      {/* Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#0F4C3A] flex items-center justify-center text-white font-bold text-xl">
              G
            </div>
            <div>
              <span className="font-bold text-lg text-[#0F4C3A] tracking-tight">GEO TRANSIT</span>
              <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider -mt-1">
                Enterprise Logistics Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links with distinct Logistics & Shop entries */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#solutions" className="hover:text-[#0F4C3A] transition">Solutions</a>
            <Link href="/dashboard/calculator" className="hover:text-[#0F4C3A] transition flex items-center gap-1">
              <Scale className="w-4 h-4 text-[#107c5a]" />
              <span>Logistics Tools</span>
            </Link>
            <Link href="/dashboard/packaging" className="hover:text-[#0F4C3A] transition flex items-center gap-1">
              <ShoppingCart className="w-4 h-4 text-[#107c5a]" />
              <span>Packaging Shop</span>
            </Link>
            <a href="#how-it-works" className="hover:text-[#0F4C3A] transition">How It Works</a>
            <a href="#pricing" className="hover:text-[#0F4C3A] transition">Pricing</a>
            <a href={`mailto:${cms.supportEmail}`} className="hover:text-[#0F4C3A] transition">Support</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-[#0F4C3A] hover:text-[#1E8262] transition">
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Two Primary Entry Paths */}
      <section className="bg-gradient-to-b from-[#0F4C3A] to-[#145d47] text-white py-20 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-block bg-[#1E8262] text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-6">
            Two Core Services • One Enterprise Platform
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
            {cms.heroHeadline}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-emerald-100 max-w-3xl mx-auto leading-relaxed font-light">
            GEO TRANSIT equips logistics businesses with precision volumetric calculators, rate engine analytics, and high-grade cargo packaging supplies.
          </p>

          {/* Two Prominent Entry Call-to-Actions */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
            <Link
              href="/dashboard/calculator"
              className="bg-white text-slate-800 p-5 rounded-2xl shadow-xl hover:bg-emerald-50/90 transition group border border-white/20 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center mb-3 font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-[#107c5a] uppercase tracking-wider block">LOGISTICS TOOLS</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">Calculate. Compare. Track.</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Volumetric weight calculations, rate card comparison, pincode verification & tracking.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#0F4C3A]">
                <span>Open Logistics Tools</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            <Link
              href="/dashboard/packaging"
              className="bg-[#1E8262] text-white p-5 rounded-2xl shadow-xl hover:bg-[#259b75] transition group border border-emerald-400/30 flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-white text-[#0F4C3A] flex items-center justify-center mb-3 font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider block">CARGO PACKAGING SHOP</span>
                <h3 className="text-base font-extrabold text-white mt-1">Packaging for Your Shipments</h3>
                <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                  Cotton box variants, stretch wraps, sealing tapes, or custom bulk requirements.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-500/50 flex items-center justify-between text-xs font-bold text-white">
                <span>Visit Packaging Shop</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Two Core Solutions Detailed Showcase */}
      <section id="solutions" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Two Core Solutions</h2>
            <p className="text-slate-500 mt-2 font-medium">Clear operational separation between SaaS logistics tools and packaging supply chain</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Logistics Tools Card */}
            <div className="border border-slate-200 rounded-2xl p-8 hover:border-[#107c5a] transition space-y-6 shadow-sm bg-gradient-to-br from-white to-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] text-[#0F4C3A] flex items-center justify-center font-bold">
                  <Scale className="w-6 h-6" />
                </div>
                <span className="bg-[#E8F5E9] text-[#0F4C3A] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                  Primary Product
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Logistics & Calculation Tools</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed font-medium">
                  Complete cargo weight evaluation engine supporting domestic and international shipping modes, dynamic unit conversions, custom divisors, and rate card comparisons.
                </p>
              </div>
              <ul className="space-y-3 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#107c5a] shrink-0" />
                  <span>Volumetric Weight Calculator (4000, 4500, 5000 & custom divisors)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#107c5a] shrink-0" />
                  <span>Rate Card Comparison Engine (System & Custom User Rate Cards)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#107c5a] shrink-0" />
                  <span>Instant Customer-Branded PDF Report Generation</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#107c5a] shrink-0" />
                  <span>Pincode Serviceability & Carrier Tracking Links</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link
                  href="/dashboard/calculator"
                  className="inline-flex items-center gap-2 bg-[#0F4C3A] hover:bg-[#1E8262] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <span>Open Logistics Tools</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Packaging Shop Card */}
            <div className="border border-slate-200 rounded-2xl p-8 hover:border-[#107c5a] transition space-y-6 shadow-sm bg-gradient-to-br from-white to-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-100/60 text-[#0F4C3A] flex items-center justify-center font-bold">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                  Supply Chain
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">Cargo Packaging Shop</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed font-medium">
                  Direct access to standard cargo boxes, stretch wrap rolls, sealing tapes, and dedicated bulk requirement quoting for enterprise logistics operations.
                </p>
              </div>
              <ul className="space-y-3 text-xs font-semibold text-slate-700">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#107c5a] shrink-0" />
                  <span>Cotton Box Dimension Variants (Multiple L × W × H sizes)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#107c5a] shrink-0" />
                  <span>Industrial Sin Stretch Wrap & Heavy-Duty Sealing Tapes</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#107c5a] shrink-0" />
                  <span>Custom / Bulk Requirement Quotation Request Workflow</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#107c5a] shrink-0" />
                  <span>Instant Direct Shopping without requiring calculation steps</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link
                  href="/dashboard/packaging"
                  className="inline-flex items-center gap-2 bg-[#1E8262] hover:bg-[#259b75] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <span>Visit Packaging Shop</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Platform Capabilities</h2>
            <p className="text-slate-500 mt-2 font-medium">Engineered for commercial freight handlers, courier agencies, and ecommerce logistics</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-[#1E8262] transition group shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#0F4C3A] mb-5 font-bold">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#0F4C3A]">Chargeable Weight Calculator</h3>
              <p className="text-slate-600 text-xs mt-2 leading-relaxed font-medium">
                Compute actual and volumetric weights dynamically. Convert seamless dimensions across MM, CM, Inch, and Feet.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-[#1E8262] transition group shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#0F4C3A] mb-5 font-bold">
                <Boxes className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#0F4C3A]">Multiple Box Size Variants</h3>
              <p className="text-slate-600 text-xs mt-2 leading-relaxed font-medium">
                Select pre-configured cotton box dimensions or submit custom dimension inquiries directly to shop admins.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-[#1E8262] transition group shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#0F4C3A] mb-5 font-bold">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#0F4C3A]">Bulk Custom Quotations</h3>
              <p className="text-slate-600 text-xs mt-2 leading-relaxed font-medium">
                Submit custom size & quantity requirements. Receive formal admin quotations and accept/pay directly online.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-[#1E8262] transition group shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#0F4C3A] mb-5 font-bold">
                <Navigation className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#0F4C3A]">Shipment Tracking Links</h3>
              <p className="text-slate-600 text-xs mt-2 leading-relaxed font-medium">
                Carrier hub with instant tracking integration for Delhivery, Blue Dart, DTDC, and custom logistics networks.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-[#1E8262] transition group shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#0F4C3A] mb-5 font-bold">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#0F4C3A]">Pincode Directory & Mapping</h3>
              <p className="text-slate-600 text-xs mt-2 leading-relaxed font-medium">
                Verify origin and destination pincode serviceability and custom state region mappings instantly.
              </p>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-[#1E8262] transition group shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#0F4C3A] mb-5 font-bold">
                <Tablet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-[#0F4C3A]">Multi-Device Access Licensing</h3>
              <p className="text-slate-600 text-xs mt-2 leading-relaxed font-medium">
                Enterprise device session protection enforcing simultaneous active user slot limits across team members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works & Visual Workflow */}
      <section id="how-it-works" className="py-20 bg-white border-t border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* 5-Step Logistics Journey */}
          <div>
            <div className="text-center mb-12">
              <span className="inline-block bg-emerald-100/70 text-[#0F4C3A] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-emerald-200">
                Strategic Process
              </span>
              <h2 className="text-3xl font-bold text-slate-900">The GEO TRANSIT Journey</h2>
              <p className="text-slate-500 mt-2 font-medium">A unified SaaS experience built for speed, accuracy, and operational control</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl hover-lift space-y-3">
                <span className="text-[10px] font-black text-[#107c5a] uppercase tracking-wider block">01 • CALCULATE</span>
                <h4 className="font-extrabold text-sm text-slate-900">Volumetric & Chargeable Weight</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Evaluate actual vs volumetric weight with custom mode divisors (4000, 4500, 5000).
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl hover-lift space-y-3">
                <span className="text-[10px] font-black text-[#107c5a] uppercase tracking-wider block">02 • COMPARE</span>
                <h4 className="font-extrabold text-sm text-slate-900">Courier & Service Rates</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Compare contract slabs across DTDC, BlueDart, Delhivery, and custom user rate cards.
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl hover-lift space-y-3">
                <span className="text-[10px] font-black text-[#107c5a] uppercase tracking-wider block">03 • SHIP</span>
                <h4 className="font-extrabold text-sm text-slate-900">Optimal Logistics Option</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Select best price carriers or order custom-sized cotton boxes & sealing tapes.
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl hover-lift space-y-3">
                <span className="text-[10px] font-black text-[#107c5a] uppercase tracking-wider block">04 • TRACK</span>
                <h4 className="font-extrabold text-sm text-slate-900">Carrier Shipments</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Monitor live parcel progress and pincode serviceability in real time.
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl hover-lift space-y-3">
                <span className="text-[10px] font-black text-[#107c5a] uppercase tracking-wider block">05 • MANAGE</span>
                <h4 className="font-extrabold text-sm text-slate-900">Logistics Operations</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Generate PDF quotes, audit calculation history, and control team device slots.
                </p>
              </div>
            </div>
          </div>

          {/* Infographic Visual Sequence */}
          <div className="pt-6 border-t border-slate-100">
            <LogisticsWorkflowInfographic />
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Flexible Licensing Plans</h2>
            <p className="text-slate-500 mt-2 font-medium">Upgrade or renew based on simultaneous active device requirements</p>
          </div>

          <LandingPricing initialPlans={JSON.parse(JSON.stringify(plans))} />
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="bg-[#0F4C3A] text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-black">Ready to simplify your logistics & cargo packaging?</h2>
          <p className="text-emerald-100 text-sm max-w-xl mx-auto font-light">
            Join logistics companies using GEO TRANSIT for volumetric weight calculation, rate card comparison, and commercial cargo supplies.
          </p>
          <div className="pt-2 flex justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="bg-white text-[#0F4C3A] hover:bg-emerald-50 px-6 py-3 rounded-xl text-sm font-bold transition shadow-lg"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-white text-[#0F4C3A] flex items-center justify-center font-bold text-lg">
              G
            </div>
            <div>
              <span className="font-bold tracking-tight text-white">GEO TRANSIT</span>
              <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider -mt-1">
                Enterprise Logistics Platform
              </span>
            </div>
          </div>

          <div className="text-slate-400 text-xs text-center md:text-right">
            <p>{cms.footerText}</p>
            <p className="mt-1">Support: <a href={`mailto:${cms.supportEmail}`} className="underline text-emerald-400 hover:text-emerald-300">{cms.supportEmail}</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
