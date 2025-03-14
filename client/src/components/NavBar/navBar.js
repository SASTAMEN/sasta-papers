import React, { useState } from 'react';
import { BrowserRouter as Router, Link } from 'react-router-dom';
const NavBar = ({ isLoggedIn, username }) => {
    const [searchFocus, setSearchFocus] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <Router>
            <nav className="navbar">
                <div className="navbar-logo">Logo</div>
                <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                    <Link to="/popular-papers">Popular Papers</Link>
                    {isLoggedIn && <Link to="/my-papers">My Papers</Link>}
                    <div className={`search-bar ${searchFocus ? 'focused' : ''}`}>
                        <input
                            type="text"
                            placeholder="Search..."
                            onFocus={() => setSearchFocus(true)}
                            onBlur={() => setSearchFocus(false)}
                        />
                        <select>
                            <option value="college">College Name</option>
                            <option value="topic">Topic</option>
                            <option value="author">Author</option>
                        </select>
                    </div>
                    {!isLoggedIn ? (
                        <>
                            <Link to="/sign-in" className="sign-in">Sign In</Link>
                            <Link to="/sign-up" className="sign-up">Sign Up</Link>
                        </>
                    ) : (
                        <div className="user-menu">
                            <span>Hello, {username}</span>
                            <div className="dropdown">
                                <Link to="/profile">Profile</Link>
                                <Link to="/settings">Account Settings</Link>
                                <Link to="/sign-out">Sign Out</Link>
                            </div>
                        </div>
                    )}
                </div>
                <div className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
                    ☰
                </div>
            </nav>
        </Router>
    );
};

export default NavBar;