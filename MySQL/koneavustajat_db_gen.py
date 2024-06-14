from pathlib import Path
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import create_engine, Column, INTEGER, TEXT, DATETIME, BOOLEAN, ForeignKey, Table, MetaData, text, UniqueConstraint, func
from sqlalchemy.exc import OperationalError

Base = declarative_base()

def main():
	# Modular user credentials
	# username = "admin"
	# password = "xJj3dJTtZagDxPl1"

	# Create credentials folder if it does not exist
	finPath = Path(__file__).resolve().parent.joinpath("credentials")
	namePath = finPath.joinpath("username")
	pwdPath = finPath.joinpath("password")

	if not finPath.exists():
		finPath.mkdir()

	if not namePath.exists() or not pwdPath.exists():
		namePath.touch()
		pwdPath.touch()

	# Use previously saved credentials
	if namePath.exists() and pwdPath.exists() and namePath.stat().st_size > 0 and pwdPath.stat().st_size > 0:
		saved_creds_input = input("Do you want to use previously saved credentials? (Y/N) \n")
	else:
		saved_creds_input = "N"

	# Use saved credentials
	if saved_creds_input.upper() in ["Y", "YES"]:
		with namePath.open("r") as file:
			username = file.read()
		with pwdPath.open("r") as file:
			password = file.read()
	else:
		username = input("Please enter mysql username: ")
		password = input("Please enter mysql password: ")
		# Save given credentials
		cred_data_input = input("Do you want to save your credentials? (Y/N) \n")
		if cred_data_input.upper() in ["Y", "YES"]:
			try:
				with namePath.open(mode="w") as file:
					file.write(username)
				with pwdPath.open(mode="w") as file:
					file.write(password)
			except Exception as e:
				print("Failed to write to file: {e}")
			print("Saved credentials")


	# MySQL connection string: "mysql+pymysql://user:password@host/dbname"
	# Connect to mysql
	engine = create_engine(f"mysql+pymysql://{username}:{password}@localhost", echo=True)

	# Create db if it does not exist
	with engine.connect() as conn:
		try:
			conn.execute(text("CREATE DATABASE IF NOT EXISTS koneavustajat_db"))
			conn.execute(text("USE koneavustajat_db"))
		except OperationalError as e:
			print(f"Error occurred: {e}")

	# Connect to db
	engine = create_engine(f"mysql+pymysql://{username}:{password}@localhost/koneavustajat_db", echo=True, pool_pre_ping=True)
	Base.metadata.create_all(engine)

	Session = sessionmaker(bind=engine)
	session = Session()

	# Define metadata information
	metadata = MetaData()

	define_triggers(engine, session, metadata)
	add_entries(engine, session, metadata)
	trigger_check(engine, session, metadata)

	return engine, session, metadata

def define_triggers(engine, session, metadata):
	# Create a trigger for users regarding roles
	admin_before_trigger = """
	CREATE TRIGGER check_admin_role BEFORE INSERT ON admins
	FOR EACH ROW BEGIN
		DECLARE role_id INT;

		SELECT RoleID INTO role_id FROM users WHERE UserID = NEW.UserID;

		IF role_id != 4 THEN
			SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = 'This user is not an admin';
		END IF;
	END;
	"""

	# Create db if it does not exist
	with engine.connect() as conn:
		try:
			conn.execute(text(admin_before_trigger))
		except OperationalError as e:
			print(f"Error occurred: {e}")

def trigger_check(engine, session, metadata):
	users = [
		User(Name="notastudent", RoleID=3, Email="notastudent@example.com", Password="notastudent"),
	]

	students = [
		Student(UserID=9, StartYear="2021"),
	]

	try:
		[session.merge(user) for user in users]
		[session.merge(student) for student in students]
		session.commit()
	except OperationalError:	
		print("Trigger check successful!")
	else:
		raise Exception("Trigger check failed")


	
def add_entries(engine, session, metadata):
	# Add entries to the "users" table
	users = [
		User(Name="Sami", Gender="Male", RoleID=2, Email="sami@example.com", Password="password1"), # Note: Unhashed passwords do not work due to bcrypt
		User(Name="Benjamin", Gender="Male", RoleID=2, Email="benjamin@example.com", Password="password2"),
		User(Name="JwtTest", Gender="Male", RoleID=4, Email="jwt@test.user", Password="$2b$10$i.CS1P1lXPH90QFs2kXj7u4Ple/9zVVz4BLs77G8av4gWlNwzdhRG"),
		User(Name="Tester", Gender="Female", RoleID=2, Email="tester@example.com", Password="password4"),
		User(Name="AnotherUser", Gender="Female", RoleID=1, Email="anotheruser@example.com", Password="password5"),
		User(Name="AdminGuy", Gender="Male", RoleID=4, Email="adminguy@example.com", Password="password6"),
		User(Name="Customererman", Gender="Male", RoleID=3, Email="customerman@example.com", Password="password7"),
		User(Name="Guestsigner", Gender="Male", Email="guest@signer.com", Password="password7"),
	]

	# Add entries to the "roles" table
	roles = [
		Role(RoleName="Guest", AccessLevel="1"),
		Role(RoleName="Customer", AccessLevel="2"),
		Role(RoleName="Employee", AccessLevel="3"),
		Role(RoleName="Admin", AccessLevel="4"),
	]

	# Add entries to the "admins" table
	admins = [
		Admin(UserID=3, Department="CEO"),
		Admin(UserID=6, Department="IT"),
	]

	# Add entries to the session and commit changes
	try:
		[session.merge(role) for role in roles]
		[session.merge(user) for user in users]
		[session.merge(admin) for admin in admins]
		session.commit()
	except OperationalError as e:
		print(f"Failed to add test data: {e}")


#Create all tables
class User(Base):
	__tablename__ = "users"
	__table_args__ = (
		Column("UserID", INTEGER, primary_key=True, autoincrement=True),
		Column("Name", TEXT),
		Column("Gender", TEXT),
		Column("ProfileImage", TEXT),
		Column("RoleID", INTEGER, ForeignKey("roles.RoleID"), server_default="1"),
		Column("Email", TEXT, unique=True),
		Column("Password", TEXT),
	)

class Role(Base):
	__tablename__ = "roles"
	__table_args__ = (
		Column("RoleID", INTEGER, primary_key=True, autoincrement=True),
		Column("RoleName", TEXT),
		Column("AccessLevel", TEXT),
	)

# CONSTRAINT chk_user_role CHECK (UserID IN (SELECT UserID FROM users WHERE RoleID = 2))
class Admin(Base):
	__tablename__ = "admins"
	__table_args__ = (
		Column("AdminID", INTEGER, primary_key=True, autoincrement=True),
		Column("UserID", INTEGER, ForeignKey("users.UserID")),
		Column("Department", TEXT),
	)

if __name__ == "__main__":
	main()
