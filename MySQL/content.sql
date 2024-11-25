-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 25, 2024 at 10:48 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `koneavustajat_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `content`
--

CREATE TABLE `content` (
  `ContentID` int(11) NOT NULL,
  `Site_Identifier` varchar(255) NOT NULL,
  `Main_Tag` varchar(20) DEFAULT 'p',
  `Language` varchar(10) DEFAULT 'en',
  `Content_Text` text NOT NULL,
  `Content_Type` varchar(20) DEFAULT 'site_text',
  `Version` int(11) DEFAULT 1,
  `Added_By` int(11) DEFAULT NULL,
  `Last_Edited_By` int(11) DEFAULT NULL,
  `Created_At` timestamp NOT NULL DEFAULT current_timestamp(),
  `Modified_At` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `Status` varchar(10) DEFAULT 'draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `content`
--
ALTER TABLE `content`
  ADD PRIMARY KEY (`ContentID`),
  ADD UNIQUE KEY `Site_Identifier` (`Site_Identifier`),
  ADD UNIQUE KEY `idx_unique_content` (`Site_Identifier`,`Language`,`Version`),
  ADD KEY `Added_By` (`Added_By`),
  ADD KEY `Last_Edited_By` (`Last_Edited_By`),
  ADD KEY `idx_main_tag` (`Main_Tag`),
  ADD KEY `idx_content_type` (`Content_Type`),
  ADD KEY `idx_language` (`Language`),
  ADD KEY `idx_status` (`Status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `content`
--
ALTER TABLE `content`
  MODIFY `ContentID` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `content`
--
ALTER TABLE `content`
  ADD CONSTRAINT `content_ibfk_1` FOREIGN KEY (`Added_By`) REFERENCES `users` (`UserID`) ON DELETE SET NULL,
  ADD CONSTRAINT `content_ibfk_2` FOREIGN KEY (`Last_Edited_By`) REFERENCES `users` (`UserID`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
