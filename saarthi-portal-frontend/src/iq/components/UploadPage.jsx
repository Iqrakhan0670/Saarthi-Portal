// src/iq/components/UploadPage.jsx
// Standalone page for the Saarthi IQ "Upload" feature.
// Extracted from the old dashboard.jsx (formerly "IQ Overview") so this
// feature stays reachable now that that page is no longer routed.
import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, Search } from 'lucide-react';
import UploadForm from './UploadForm.jsx';
import { supabase } from '../../supabaseClient';

export default function UploadPage() {
  const [datasets, setDatasets] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      setDatasets(!error ? data || [] : []);
    } catch (error) {
      console.error('Error fetching files:', error);
      setDatasets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filtered = Array.isArray(datasets)
    ? datasets.filter((d) => {
        if (!d) return false;
        const term = search.toLowerCase();
        return (
          (d.original_name?.toLowerCase().includes(term) || false) ||
          (d.name?.toLowerCase().includes(term) || false) ||
          (d.uploaded_by?.toLowerCase().includes(term) || false)
        );
      })
    : [];

  const formatFileSize = (sizeMb) => {
    const size = Number(sizeMb || 0);
    if (size === 0) return '0 MB';
    return size >= 1024 ? `${(size / 1024).toFixed(2)} GB` : `${size.toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '-';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-purple-600" />
            Upload Candidate Data
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload new datasets for Saarthi IQ to process and index.
          </p>
        </div>

        {/* Upload widget */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <UploadForm onUpload={fetchFiles} />
        </div>

        {/* Datasets Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h3 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
              <FileText size={20} className="text-purple-600" /> Uploaded Datasets
            </h3>
            <div className="relative w-full md:w-auto">
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-64 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition duration-150"
              />
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-purple-50">
                <tr className="text-left text-xs text-purple-700 uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Name</th>
                  <th className="py-3 px-4 font-bold">Size</th>
                  <th className="py-3 px-4 font-bold">Last Modified</th>
                  <th className="py-3 px-4 font-bold">Uploaded By</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500 italic">
                      {search ? 'No datasets match your search.' : 'No datasets available.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((file, idx) => (
                    <tr key={file.id || idx} className="hover:bg-gray-50 transition duration-150">
                      <td className="py-3 px-4 text-gray-800 font-medium">
                        {file.original_name || file.name || 'Unnamed File'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatFileSize(file.size_mb)}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{formatDate(file.modified)}</td>
                      <td className="py-3 px-4 text-gray-600">{file.uploaded_by || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
