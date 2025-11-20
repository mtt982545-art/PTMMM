import AppShell from '../../components/layout/app-shell';

function TentangPage() {
  return (
    <AppShell>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Tentang PTMMM WMS Digital Tracking
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Solusi manajemen gudang modern yang membantu bisnis mengoptimalkan operasi logistik mereka
            </p>
            <p className="mt-4 text-gray-700 max-w-3xl mx-auto">
              Salah satu inisiatif utama kami adalah modul Digital Tracking untuk logistik & WMS,
              yang mengintegrasikan Google Sheets, Supabase, dan API scan demi visibilitas real-time.
            </p>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Fitur Utama
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Pelacakan real-time shipment dan inventory
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Manajemen order dan pengiriman terintegrasi
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Analitik dan reporting canggih
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  Integrasi dengan Google Sheets dan Supabase
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Keuntungan
              </h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  Efisiensi operasional meningkat hingga 40%
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  Reduksi error manajemen inventory
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  Transparansi supply chain real-time
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">•</span>
                  Akses berbasis role untuk keamanan data
                </li>
              </ul>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Teknologi yang Digunakan
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="bg-blue-100 rounded-lg p-4 mb-2">
                  <span className="text-blue-600 font-semibold">Next.js</span>
                </div>
                <p className="text-sm text-gray-600">Frontend Framework</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-lg p-4 mb-2">
                  <span className="text-green-600 font-semibold">Supabase</span>
                </div>
                <p className="text-sm text-gray-600">Database & Auth</p>
              </div>
              <div className="text-center">
                <div className="bg-yellow-100 rounded-lg p-4 mb-2">
                  <span className="text-yellow-600 font-semibold">Google Sheets</span>
                </div>
                <p className="text-sm text-gray-600">Master Data</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-lg p-4 mb-2">
                  <span className="text-purple-600 font-semibold">Apps Script</span>
                </div>
                <p className="text-sm text-gray-600">Integration Engine</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center bg-blue-50 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Siap Mengoptimalkan Gudang Anda?
            </h2>
            <p className="text-gray-600 mb-6">
              Bergabunglah dengan banyak perusahaan yang telah meningkatkan efisiensi operasional mereka dengan PTMMM WMS Digital Tracking.
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="/dashboard"
                className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mulai Dashboard
              </a>
              <a
                href="/login"
                className="inline-flex items-center px-8 py-3 bg-white text-blue-600 border border-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
export default TentangPage;
