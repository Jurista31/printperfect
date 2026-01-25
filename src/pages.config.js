import Home from './pages/Home';
import Community from './pages/Community';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Community": Community,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};