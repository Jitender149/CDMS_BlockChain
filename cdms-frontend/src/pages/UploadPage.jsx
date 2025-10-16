import React, { useState } from "react";
import { Upload, Lock, Shield } from "lucide-react";

const UploadPage = ({ user }) => {
  const [formData, setFormData] = useState({
    caseId: "",
    recordType: "FIR",
    category: "SuspectRecord",
    description: "",
    file: null,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Record uploaded successfully! (Demo)");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Upload New Record</h1>
        <p className="text-gray-600 mt-1">
          Add encrypted criminal data to the blockchain
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Case ID
              </label>
              <input
                type="text"
                value={formData.caseId}
                onChange={(e) =>
                  setFormData({ ...formData, caseId: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="CASE-XXX"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Record Type
              </label>
              <select
                value={formData.recordType}
                onChange={(e) =>
                  setFormData({ ...formData, recordType: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="FIR">FIR - First Information Report</option>
                <option value="Evidence">Evidence</option>
                <option value="Report">Investigation Report</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="SuspectRecord">Suspect Record</option>
              <option value="VictimRecord">Victim Record</option>
              <option value="ForensicEvidence">Forensic Evidence</option>
              <option value="CrimeSceneData">Crime Scene Data</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter detailed description of the record..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File (Encrypted with AES-256-GCM)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
              <input
                type="file"
                onChange={(e) =>
                  setFormData({ ...formData, file: e.target.files[0] })
                }
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {formData.file
                    ? formData.file.name
                    : "Click to upload or drag and drop"}
                </p>
                <p className="text-sm text-gray-500">
                  PDF, Images, Videos (Max 100MB)
                </p>
              </label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Security Notice</p>
                <p>
                  Files will be encrypted with AES-256-GCM. Metadata and hash
                  stored on Hyperledger Fabric. Access controlled by RBAC/ABAC
                  policies.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center"
            >
              <Lock className="w-5 h-5 mr-2" />
              Encrypt & Upload to Blockchain
            </button>
            <button
              type="button"
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default UploadPage;
