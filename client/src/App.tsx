import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import InstanceForm from './pages/InstanceForm';
import SonarrMedia from './pages/SonarrMedia';
import RadarrMedia from './pages/RadarrMedia';
import QualityProfiles from './pages/QualityProfiles';
import DiskSpace from './pages/DiskSpace';
import PlexLibrary from './pages/PlexLibrary';
import Compare from './pages/Compare';
import CutoffUnmet from './pages/CutoffUnmet';
import Queue from './pages/Queue';
import Activity from './pages/Activity';
import Settings from './pages/Settings';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/instances" element={<Instances />} />
        <Route path="/instances/new" element={<InstanceForm />} />
        <Route path="/instances/:id/edit" element={<InstanceForm />} />
        <Route path="/series" element={<SonarrMedia />} />
        <Route path="/movies" element={<RadarrMedia />} />
        <Route path="/plex" element={<PlexLibrary />} />
        <Route path="/quality" element={<QualityProfiles />} />
        <Route path="/disk-space" element={<DiskSpace />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/cutoff" element={<CutoffUnmet />} />
        <Route path="/queue" element={<Queue />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
