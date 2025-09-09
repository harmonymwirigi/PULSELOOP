import React from 'react';
import Logo from './Logo';

interface PrivacyPolicyProps {
  onClose: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  return (
    <div className="bg-slate-50 font-sans">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10 py-4 px-4 sm:px-8">
            <div className="container mx-auto flex justify-between items-center">
                <Logo textColorClassName="text-gray-800" />
                <button onClick={onClose} className="px-4 py-2 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition-colors flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    <span>Back</span>
                </button>
            </div>
        </header>

        <main className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-lg shadow-md">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-6 border-b pb-4">Terms of Use & Privacy Policy</h1>
                
                <section className="mb-10">
                    <h2 className="text-2xl font-bold text-teal-600 mb-3">Privacy & Confidentiality Disclaimer</h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                        <p>PulseLoopCare is a platform intended for professional discussion and peer support among healthcare workers. By using this platform, you agree not to post, upload, or otherwise share any Protected Health Information (PHI) or any other personally identifiable information (PII) related to patients, coworkers, or any third party. All content you share must be de-identified in accordance with HIPAA and other applicable privacy laws.</p>
                        <p>You acknowledge that any violation of these guidelines may result in the removal of your content. PulseLoopCare reserves the right to monitor, moderate, and remove content that, in its sole discretion, may risk violating patient privacy or applicable law.</p>
                        <p>PulseLoopCare is not responsible for any consequences resulting from user-submitted content. All stories and posts are the sole responsibility of the user who submitted them.</p>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-teal-600 mb-3">Your Privacy, Your Control</h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                        <p>Your login details are safe with us. We will never sell or use your personal information for commercial purposes without your clear consent.</p>
                        <p>Any optional features, research, or partnerships will always require you to opt in first.</p>
                    </div>
                </section>
            </div>
        </main>
        
        <footer className="bg-gray-800 text-white py-6 mt-12">
            <div className="container mx-auto text-center">
                <p>&copy; {new Date().getFullYear()} PulseLoopCare. All rights reserved.</p>
            </div>
        </footer>
    </div>
  );
};

export default PrivacyPolicy;