import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documents } from '../../API/axios';
import { DocumentTextIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';

const UploadDocument = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    type: 'research_paper',
    abstract: '',
    keywords: '',
    course: '',
    department: '',
    institution: '',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedData, setExtractedData] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf' || 
          selectedFile.type === 'application/msword' || 
          selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setFile(selectedFile);
        setError('');
        await analyzeDocument(selectedFile);
      } else {
        setError('Please upload a PDF or Word document');
        setFile(null);
      }
    }
  };

  const analyzeDocument = async (file) => {
    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('document', file);

      const response = await documents.analyze(formData);
      const { abstract, keywords, summary } = response.data;

      setExtractedData({
        abstract,
        keywords,
        summary
      });

      // Pre-fill the form with extracted data
      setFormData(prev => ({
        ...prev,
        abstract: abstract || '',
        keywords: keywords?.join(', ') || ''
      }));
    } catch (error) {
      setError('Failed to analyze document. Please fill in the details manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('document', file);
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });

    try {
      setLoading(true);
      const response = await documents.upload(formDataToSend);

      if (response.data.plagiarismScore > 30) {
        setError(`Warning: High plagiarism score detected (${response.data.plagiarismScore}%)`);
      } else {
        navigate('/');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-2 text-3xl font-bold text-gray-900">Upload Research Document</h2>
          <p className="mt-1 text-sm text-gray-500">Share your research work with the academic community</p>
        </div>

        <div className="bg-white shadow-soft rounded-lg overflow-hidden">
          <div className="p-6">
            {error && (
              <div className="mb-4 bg-accent-50 border-l-4 border-accent-500 p-4">
                <p className="text-accent-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload Section */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Document File (PDF or Word)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <DocumentMagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF or Word up to 10MB</p>
                  </div>
                </div>
                {file && (
                  <p className="mt-2 text-sm text-gray-500">
                    Selected file: {file.name}
                  </p>
                )}
                {analyzing && (
                  <div className="mt-2">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mr-2"></div>
                      <p className="text-sm text-gray-500">Analyzing document...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Document Details Section */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.title}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                    Document Type
                  </label>
                  <select
                    name="type"
                    id="type"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.type}
                    onChange={handleChange}
                  >
                    <option value="research_paper">Research Paper</option>
                    <option value="course_project">Course Project</option>
                    <option value="review_paper">Review Paper</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="abstract" className="block text-sm font-medium text-gray-700">
                    Abstract
                  </label>
                  <div className="mt-1 relative">
                    <textarea
                      name="abstract"
                      id="abstract"
                      rows="4"
                      required
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      value={formData.abstract}
                      onChange={handleChange}
                    />
                    {extractedData?.abstract && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Extracted from document:</p>
                        <p className="text-sm text-gray-700 mt-1">{extractedData.abstract}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
                    Keywords (comma-separated)
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      name="keywords"
                      id="keywords"
                      required
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      value={formData.keywords}
                      onChange={handleChange}
                    />
                    {extractedData?.keywords && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Extracted keywords:</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {extractedData.keywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {extractedData?.summary && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Document Summary
                    </label>
                    <div className="mt-1 p-4 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{extractedData.summary}</p>
                    </div>
                  </div>
                )}

                {formData.type === 'course_project' && (
                  <div>
                    <label htmlFor="course" className="block text-sm font-medium text-gray-700">
                      Course
                    </label>
                    <input
                      type="text"
                      name="course"
                      id="course"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      value={formData.course}
                      onChange={handleChange}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    id="department"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.department}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
                    Institution
                  </label>
                  <input
                    type="text"
                    name="institution"
                    id="institution"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    value={formData.institution}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary-200">
                    <div
                      style={{ width: `${uploadProgress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary-500"
                    />
                  </div>
                  <p className="text-sm text-gray-500 text-center">{uploadProgress}% uploaded</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || analyzing}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadDocument; 