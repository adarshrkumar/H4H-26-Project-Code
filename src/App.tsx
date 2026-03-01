import { HashRouter, Routes, Route } from 'react-router-dom';
import ComposePageContent from './components/ComposePageContent';
import ViewPageContent from './components/ViewPageContent';

export default function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<ComposePageContent />} />
                <Route path="/view" element={<ViewPageContent />} />
            </Routes>
        </HashRouter>
    );
}
