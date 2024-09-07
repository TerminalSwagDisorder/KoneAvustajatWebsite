import { useEffect, useState, useContext } from "react";
import Container from "react-bootstrap/Container";
import { Nav, Navbar, NavDropdown, Button, Image } from "react-bootstrap";
import { Link } from "react-router-dom";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { useSelector, useDispatch } from "react-redux";

const NavBar = ({ currentUser, handleUserChange, handleSignout, ThemeContext }) => {
	const [activeLink, setActiveLink] = useState("home");
	const [scrolled, setScrolled] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);
	const { theme, toggleTheme } = useContext(ThemeContext);
	const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
	const dispatch = useDispatch();
	const cartItems = Object.values(shoppingCart);
  	const totalCartItems = cartItems.reduce((total, item) => total + item.quantity, 0);

	useEffect(() => {
		const onScroll = () => {
			if (window.scrollY > 50) {
				setScrolled(true);
			} else {
				setScrolled(false);
			}
		};

		window.addEventListener("scroll", onScroll);

		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const onUpdateActiveLink = (value) => {
		setActiveLink(value);
	};

	// Async function for signout
	const handleLogout = async () => {
		try {
			await handleSignout();
			handleUserChange(null);
		} catch (error) {
			console.log(error.message);
		}
	};

	const toggleDropdownShow = (value) => {
		setShowDropdown(value);
	};
	const toggleDropdownHide = (event) => {
		setShowDropdown(false);
	};

	const shoppingCartNavbar = () => {
		if (totalCartItems || totalCartItems > 0) {
			return (
				<Nav.Link as={Link} to="/shoppingcart" className={activeLink === "/shoppingcart" ? "active-navbar-link" : "navbar-link"} onClick={() => onUpdateActiveLink("/shoppingcart")}>
					View Cart <AiOutlineShoppingCart /> {totalCartItems}
				</Nav.Link>
			);
		}
	};

	
	const userNavbar = () => {
		let adminCheck;
		let userCheck;
		if (currentUser && currentUser.role !== "user") {
			adminCheck = (
				<>
					<Nav.Link as={Link} to="/admin/dashboard" className={activeLink === "/admin/dashboard" ? "active-navbar-link" : "navbar-link"} onClick={() => onUpdateActiveLink("/admin/dashboard")}>
						Dashboard
					</Nav.Link>
				</>
			);
		}
		if (currentUser) {
			userCheck = (
				<>
					<Nav.Link as={Link} to="/profile">
						{currentUser.Name}
					</Nav.Link>
					<Nav.Link as={Link} to="/" onClick={handleLogout}>
						Log out
					</Nav.Link>
				</>
			);
		} else {
			userCheck = (
				// If false do this
				<>
					<Nav.Link as={Link} to="/signin" className={activeLink === "/signin" ? "active-navbar-link" : "navbar-link"} onClick={() => onUpdateActiveLink("/signin")}>
						Not signed in
					</Nav.Link>
					<Nav.Link as={Link} to="/signup" className={activeLink === "/signup" ? "active-navbar-link" : "navbar-link"} onClick={() => onUpdateActiveLink("/signup")}>
						Signup
					</Nav.Link>
				</>
			);
		}
		return (
			<>
				{userCheck}
				{adminCheck}
			</>
		);
	};

	return (
		<Navbar expand="md" className={scrolled ? "scrolled" : ""}>
			<Container>
				<Navbar.Brand as={Link} to="/" onClick={() => onUpdateActiveLink("/")}>
					KoneAvustajat
				</Navbar.Brand>
				<Button className="themeSwitcher" onClick={toggleTheme}>
					Switch to {theme === "light" ? "Dark" : "Light"} Mode
				</Button>
				<Navbar.Toggle aria-controls="basic-navbar-nav">
					<span className="navbar-toggler-icon"></span>
				</Navbar.Toggle>
				<Navbar.Collapse id="basic-navbar-nav">
					<Nav className="mx-auto">
						<Nav.Link
							as={Link}
							to="/"
							className={activeLink === "/" ? "active-navbar-link" : "navbar-link"}
							onClick={() => onUpdateActiveLink("/")}>
							Home
						</Nav.Link>

						<NavDropdown
							title={
								<Link
									to="/computerwizard"
									onClick={() => onUpdateActiveLink("/computerwizard")}>
									Computer Wizard
								</Link>
							}
							className={
								[
									"/computerwizard",
									"/computerwizard/browse",
									"/computerwizard/purchase",
									"/computerwizard/build"
								].includes(activeLink)
									? "active-navbar-link"
									: "navbar-link"
							}
							name="computer_wizard"
							id="collasible-nav-dropdown"
							show={showDropdown === "computer_wizard"}
							onMouseEnter={() => toggleDropdownShow("computer_wizard")}
							onMouseLeave={toggleDropdownHide}>
							<NavDropdown.Item
								as={Link}
								to="/computerwizard/browse"
								className={
									activeLink === "/computerwizard/browse" ? "active-navbar-link" : "navbar-link"
								}
								onClick={() => onUpdateActiveLink("/computerwizard/browse")}>
								Browse
							</NavDropdown.Item>
							<NavDropdown.Item
								as={Link}
								to="/computerwizard/purchase"
								className={
									activeLink === "/computerwizard/purchase" ? "active-navbar-link" : "navbar-link"
								}
								onClick={() => onUpdateActiveLink("/computerwizard/purchase")}>
								Purchase
							</NavDropdown.Item>
							<NavDropdown.Item
								as={Link}
								to="/computerwizard/build"
								className={
									activeLink === "/computerwizard/build" ? "active-navbar-link" : "navbar-link"
								}
								onClick={() => onUpdateActiveLink("/computerwizard/build")}>
								Build
							</NavDropdown.Item>
						</NavDropdown>

						<NavDropdown
							title={
								<Link
									to="/usedparts"
									onClick={() => onUpdateActiveLink("/usedparts")}>
									Used parts
								</Link>
							}
							className={
								[
									"/usedparts",
									"/usedparts/browse",
									"/usedparts/purchase",
									"/usedparts/build"
								].includes(activeLink)
									? "active-navbar-link"
									: "navbar-link"
							}
							name="used_parts"
							id="collasible-nav-dropdown"
							show={showDropdown === "used_parts"}
							onMouseEnter={() => toggleDropdownShow("used_parts")}
							onMouseLeave={toggleDropdownHide}>
							<NavDropdown.Item
								as={Link}
								to="/usedparts/browse"
								className={
									activeLink === "/usedparts/browse" ? "active-navbar-link" : "navbar-link"
								}
								onClick={() => onUpdateActiveLink("/usedparts/browse")}>
								Browse
							</NavDropdown.Item>
							<NavDropdown.Item
								as={Link}
								to="/usedparts/purchase"
								className={
									activeLink === "/usedparts/purchase" ? "active-navbar-link" : "navbar-link"
								}
								onClick={() => onUpdateActiveLink("/usedparts/purchase")}>
								Purchase
							</NavDropdown.Item>
							<NavDropdown.Item
								as={Link}
								to="/usedparts/build"
								className={
									activeLink === "/usedparts/build" ? "active-navbar-link" : "navbar-link"
								}
								onClick={() => onUpdateActiveLink("/usedparts/build")}>
								Build
							</NavDropdown.Item>
						</NavDropdown>
					</Nav>
					<Nav className="ml-auto">{userNavbar()}</Nav>
					<Nav className="ml-auto">{shoppingCartNavbar()}</Nav>

				</Navbar.Collapse>
			</Container>
		</Navbar>
	);
};

export default NavBar;
