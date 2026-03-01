import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ComposePageContent from './components/ComposePageContent';
import ViewPageContent from './components/ViewPageContent';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ComposePageContent />} />
                <Route path="/view" element={<ViewPageContent />} />
            </Routes>
        </BrowserRouter>
    );
}
