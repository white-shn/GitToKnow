import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import RepoProvider from '@/features/repo-analysis/RepoProvider'
import AiSummaryPage from '@/pages/AiSummaryPage'
import AskRepoPage from '@/pages/AskRepoPage'
import FileStructurePage from '@/pages/FileStructurePage'
import StructureMapPage from '@/pages/StructureMapPage'

export default function App() {
  return (
    <RepoProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/summary" replace />} />
            <Route path="summary" element={<AiSummaryPage />} />
            <Route path="ai-summary" element={<Navigate to="/summary" replace />} />

            <Route path="structure" element={<FileStructurePage />} />
            <Route path="file-structure" element={<Navigate to="/structure" replace />} />
            <Route path="files" element={<Navigate to="/structure" replace />} />

            <Route path="map" element={<StructureMapPage />} />
            <Route path="structure-map" element={<Navigate to="/map" replace />} />
            <Route path="architecture" element={<Navigate to="/map" replace />} />

            <Route path="ask" element={<AskRepoPage />} />
            <Route path="ask-the-repo" element={<Navigate to="/ask" replace />} />
            <Route path="chat" element={<Navigate to="/ask" replace />} />

            <Route path="*" element={<Navigate to="/summary" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RepoProvider>
  )
}
