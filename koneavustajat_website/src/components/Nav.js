import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import { Nav, Navbar, NavDropdown, Button, Image, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { useSelector, useDispatch } from "react-redux";
import { useTheme, useLanguage, useModal, useAuth, useError, useContent } from "../utils/Contexts";
import { useRenderContent, fetchPageContent } from "../utils/ContentUtils";
import { useLocation } from "react-router-dom";

const NavBar = ({ handleSignout }) => {
	const renderContent = useRenderContent();
	const { fetchPageContentOverride } = useContent();
	const { displayError } = useError();
	const location = useLocation();
	const [scrolled, setScrolled] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const { theme, toggleTheme } = useTheme();
	const { language, changeLanguage } = useLanguage();
	const { openModal } = useModal();
	const { currentUser, handleUserChange } = useAuth();
	const shoppingCart = useSelector((state) => state.shoppingCart.shoppingCart);
	const dispatch = useDispatch();
	const cartItems = Object.values(shoppingCart);
  	const totalCartItems = cartItems.reduce((total, item) => total + (item.quantity || 1), 0);

	useEffect(() => {
		fetchPageContentOverride({page: "nav"});
		
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

	const handleOpenModal = () => {
		openModal(
			<div>
				<h3>{renderContent("nav.manage_content_modal.title", "Manage Content")}</h3>
				<p>{renderContent("nav.manage_content_modal.description", "Edit or update your content from here.")}</p>
			</div>
		);
	};

	// Async function for signout
	const handleLogout = async () => {
		try {
			setIsLoggingOut(true);
			await handleSignout();
			handleUserChange(null);
			displayError("Successfully logged out!", "success")
		} catch (error) {
			displayError(error);
			console.log(error.message || error);
		} finally {
			setIsLoggingOut(false);
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
				<Nav.Link as={Link} to="/shoppingcart" className={location.pathname === "/shoppingcart" ? "active-navbar-link" : "navbar-link"}>
					{renderContent("nav.cart.view", "View Cart")} <AiOutlineShoppingCart /> {totalCartItems}
				</Nav.Link>
			);
		}
	};

	
	const userNavbar = () => {
		let adminCheck;
		let userCheck;
		if (currentUser && currentUser.RoleID === 4) {
			adminCheck = (
			<>
					<NavDropdown
						title={
							<Link
								to="/admin/dashboard">
								{renderContent("nav.admin_dashboard", "Admin dashboard")}
							</Link>
						}
						className={
							[
								"/admin/dashboard",
								"/admin/users",
								"/admin/orders",
								"/admin/email-transactions",
								"/admin/opensearch",
							].includes(location.pathname)
								? "active-navbar-link"
								: "navbar-link"
						}
						name="admin"
						id="collasible-nav-dropdown"
						show={showDropdown === "admin"}
						onMouseEnter={() => toggleDropdownShow("admin")}
						onMouseLeave={toggleDropdownHide}>
						<NavDropdown.Item
							as={Link}
							to="/admin/users"
							className={
								location.pathname === "/admin/users" ? "active-navbar-link" : "navbar-link"
							}>
							{renderContent("nav.manage_users", "Manage users")}
						</NavDropdown.Item>
						<NavDropdown.Item
							as={Link}
							to="/admin/orders"
							className={
								location.pathname === "/admin/orders" ? "active-navbar-link" : "navbar-link"
							}>
							{renderContent("nav.manage_orders", "Manage orders")}
						</NavDropdown.Item>
						<NavDropdown.Item
							as={Link}
							to="/admin/email-transactions"
							className={
								location.pathname === "/admin/email-transactions" ? "active-navbar-link" : "navbar-link"
							}>
							{renderContent("nav.view_email_transactions", "View email transactions")}
						</NavDropdown.Item>
						<NavDropdown.Item
							as={Link}
							to="/admin/opensearch"
							className={
								location.pathname === "/admin/opensearch" ? "active-navbar-link" : "navbar-link"
							}>
							{renderContent("nav.manage_opensearch", "Manage opensearch")}
						</NavDropdown.Item>
					</NavDropdown>
				</>
			);
		}
		if (currentUser) {
			userCheck = (
				<>
					<Nav.Link as={Link} to="/profile" className={location.pathname === "/profile" ? "active-navbar-link" : "navbar-link"}>
						{currentUser.Name}
					</Nav.Link>
					<Nav.Link as={Link} to="/" onClick={isLoggingOut ? "" : handleLogout}>
						{isLoggingOut ?
						 <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : (
						 renderContent("nav.button.logout", "Log out")
						 )}
					</Nav.Link>
				</>
			);
		} else {
			userCheck = (
				// If false do this
				<>
					<Nav.Link as={Link} to="/signin" className={location.pathname === "/signin" ? "active-navbar-link" : "navbar-link"}>
						{renderContent("nav.status.not_signed_in", "Not signed in")}
					</Nav.Link>
					<Nav.Link as={Link} to="/signup" className={location.pathname === "/signup" ? "active-navbar-link" : "navbar-link"}>
						{renderContent("nav.button.signup", "Signup")}
					</Nav.Link>
				</>
			);
		}
		return (
			<>
				{adminCheck}
				{userCheck}
			</>
		);
	};

	return (
		<Navbar expand="md" className={scrolled ? "scrolled" : ""}>
			<Container>
				<Navbar.Brand as={Link} to="/">
					{renderContent("nav.brand", "KoneAvustajat")}
				</Navbar.Brand>
				<Button className="themeSwitcher" onClick={toggleTheme}>
					{renderContent("nav.theme_switch", "Switch theme")}
				</Button>
				<Button className="languageSwitcher" onClick={() => changeLanguage(language === "en" ? "fi" : "en")}>
					{renderContent("nav.language_switch", "Lang:")} {language}
				</Button>
				{currentUser && currentUser.RoleID === 4 && (
					<Button variant="primary" onClick={handleOpenModal}>
						{renderContent("nav.button.manage_content", "Manage Content")} 
					</Button>
 				)}
				<Navbar.Toggle aria-controls="basic-navbar-nav">
					<span className="navbar-toggler-icon"></span>
				</Navbar.Toggle>
				<Navbar.Collapse id="basic-navbar-nav">
					<Nav className="mx-auto">
						<Nav.Link
							as={Link}
							to="/"
							className={location.pathname === "/" ? "active-navbar-link" : "navbar-link"}>
							{renderContent("nav.menu.home", "Home")}
						</Nav.Link>

						<NavDropdown
							title={
								<Link
									to="/computerwizard/browse">
									{renderContent("nav.menu.computer_wizard", "Computer Wizard")}
								</Link>
							}
							className={
								[
									"/computerwizard",
									"/computerwizard/browse",
									"/computerwizard/wizard",
									"/computerwizard/build"
								].includes(location.pathname)
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
									location.pathname === "/computerwizard/browse" ? "active-navbar-link" : "navbar-link"
								}>
								{renderContent("nav.menu.browse", "Browse")}
							</NavDropdown.Item>
							<NavDropdown.Item
								as={Link}
								to="/computerwizard/wizard"
								className={
									location.pathname === "/computerwizard/wizard" ? "active-navbar-link" : "navbar-link"
								}>
								{renderContent("nav.menu.wizard", "Wizard")}
							</NavDropdown.Item>
							<NavDropdown.Item
								as={Link}
								to="/computerwizard/build"
								className={
									location.pathname === "/computerwizard/build" ? "active-navbar-link" : "navbar-link"
								}>
								{renderContent("nav.menu.build", "Build")}
							</NavDropdown.Item>
						</NavDropdown>
						<Nav.Link
							as={Link}
							to="/usedparts"
							className={location.pathname === "/usedparts" ? "active-navbar-link" : "navbar-link"}>
							{renderContent("nav.menu.used_parts", "Used parts")}
						</Nav.Link>
					</Nav>
					<Nav className="ml-auto">{userNavbar()}</Nav>
					<Nav className="ml-auto">{shoppingCartNavbar()}</Nav>

				</Navbar.Collapse>
			</Container>
		</Navbar>
	);
};

export default NavBar;
