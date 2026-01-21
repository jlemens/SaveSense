import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function Landing() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Inputs → Outputs</h1>
          <div className="space-x-4">
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Understand Your Monthly Cashflow
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Track your income and expenses with a guided survey, then calculate your monthly surplus or deficit.
          </p>
          <Link to="/signup">
            <Button className="text-lg px-8 py-3">Start Your Survey</Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card>
            <h3 className="text-xl font-semibold mb-2">Complete Survey</h3>
            <p className="text-gray-600">
              Answer questions about your income and expenses through our guided survey.
            </p>
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-2">Get Your Results</h3>
            <p className="text-gray-600">
              See your monthly surplus or deficit calculated from your inputs.
            </p>
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-2">Review & Share</h3>
            <p className="text-gray-600">
              Review your answers, tweak your plan, and screenshot your results to share on social or save for later.
            </p>
          </Card>
          <Card>
            <h3 className="text-xl font-semibold mb-2">Explore Scenarios</h3>
            <p className="text-gray-600">
              Test "what-if" scenarios like adding partner income, cutting expenses, or getting a raise to see how it affects your budget.
            </p>
          </Card>
        </div>

        <Card className="bg-yellow-50 border-yellow-200">
          <p className="text-sm text-gray-700">
            <strong>Disclaimer:</strong> This tool is for educational tracking only and does not provide financial advice. 
            It is not intended for portfolio tracking, stock picking, or investment recommendations.
          </p>
        </Card>
      </main>
    </div>
  );
}

