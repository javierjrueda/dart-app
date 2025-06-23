import Header from "@/components/Header";
import {
  faCamera,
  faBullseye,
  faBolt,
  faStar,
  faUsers,
  faShield,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 mb-6">
            Annotate & Rank Your{" "}
            <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
              Dreamshots
            </span>
          </h1>
          <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
            The ultimate tool for organizing, annotating, and ranking your dream
            captures. Collaborate with your team and discover insights from your
            visual content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-accent text-lg px-8 py-3">
              Start Annotating
            </button>
            <button className="btn-secondary text-lg px-8 py-3">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              Powerful Features for Dream Analysis
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Everything you need to annotate, rank, and analyze your dreamshot
              collection
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card text-center">
              <div className="bg-primary-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faCamera}
                  className="h-8 w-8 text-primary-600"
                />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                Smart Annotation
              </h3>
              <p className="text-neutral-600">
                Add precise annotations to your dreamshots with coordinate-based
                tagging and rich text descriptions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card text-center">
              <div className="bg-secondary-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faBullseye}
                  className="h-8 w-8 text-secondary-600"
                />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                Advanced Ranking
              </h3>
              <p className="text-neutral-600">
                Rank and rate your dreamshots with our sophisticated scoring
                system and community voting.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card text-center">
              <div className="bg-accent-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faBolt}
                  className="h-8 w-8 text-accent-600"
                />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">
                Real-time Collaboration
              </h3>
              <p className="text-neutral-600">
                Work together with your team in real-time. Share insights and
                build comprehensive dream databases.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary-500 mb-2">
                10K+
              </div>
              <div className="text-neutral-600">Dreamshots Analyzed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-500 mb-2">
                500+
              </div>
              <div className="text-neutral-600">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-500 mb-2">
                50K+
              </div>
              <div className="text-neutral-600">Annotations Created</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-500 mb-2">
                99.9%
              </div>
              <div className="text-neutral-600">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-500">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Your Dream Analysis Journey?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of researchers and dream enthusiasts who trust DART
            for their annotation needs.
          </p>
          <button className="bg-white text-primary-500 hover:bg-neutral-50 font-bold py-3 px-8 rounded-lg text-lg transition-colors">
            Get Started Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-primary-500 p-2 rounded-lg">
                  <FontAwesomeIcon
                    icon={faCamera}
                    className="h-5 w-5 text-white"
                  />
                </div>
                <h3 className="text-lg font-bold">DART</h3>
              </div>
              <p className="text-neutral-400">
                The ultimate dreamshot annotation and ranking platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-neutral-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-neutral-400">
                <li>
                  <a href="#" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-neutral-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-800 mt-8 pt-8 text-center">
            <p className="text-neutral-400">
              &copy; 2024 DART. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
