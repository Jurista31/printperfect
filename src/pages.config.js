import Community from './pages/Community';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Community": Community,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};